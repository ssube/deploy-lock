# Deploy Lock

This is a tool to lock a cluster or service, in order to prevent people from deploying changes during test automation or
restarting pods during an infrastructure incident.

## Contents

- [Deploy Lock](#deploy-lock)
  - [Contents](#contents)
  - [Abstract](#abstract)
    - [Example Usage](#example-usage)
      - [Prevent a deploy during an automation run](#prevent-a-deploy-during-an-automation-run)
      - [Prevent a deploy during a production incident](#prevent-a-deploy-during-a-production-incident)
      - [Prevent duplicate deploys of the same service from conflicting](#prevent-duplicate-deploys-of-the-same-service-from-conflicting)
    - [Deploy Path](#deploy-path)
    - [Lock Data](#lock-data)
    - [Messaging](#messaging)
      - [Friendly Types](#friendly-types)
    - [Command-line Interface](#command-line-interface)
      - [Basic Options](#basic-options)
      - [Lock Data Options](#lock-data-options)
      - [Storage Backend Options](#storage-backend-options)
    - [REST API](#rest-api)
      - [Endpoints](#endpoints)
    - [Questions](#questions)
    - [Testing](#testing)

## Abstract

### Example Usage

#### Prevent a deploy during an automation run

This would be used to prevent an application deploy during a test automation run, to make sure the application does not
restart or change versions and invalidate the test results.

1. QA starts an automation run
   1. Automation calls `deploy-lock lock apps/acceptance --type automation --duration 90m`
2. Someone merges code into `develop` of `saas-app`
   1. The `saas-app` pipeline runs a deploy job
   2. The deploy job calls `deploy-lock check apps/acceptance/a/saas-app/develop`, which recursively checks:
      1. `apps`
      2. `apps/acceptance`
         1. locked by automation, exit with an error
      3. `apps/acceptance/a`
      4. `apps/acceptance/a/saas-app`
      5. `apps/acceptance/a/saas-app/develop`
   3. Deploy job exits with an error, _does not_ deploy
3. Automation pipeline ends
   1. Final job calls `deploy-lock unlock apps/acceptance --type automation`
      1. Specifying the `--type` during `unlock` prevents automation/deploy jobs from accidentally removing an incident
   2. If the final automation job does not run, the lock will still expire after 90 minutes (`--duration`)
4. Retry `saas-app` deploy job
   1. No lock, runs normally

#### Prevent a deploy during a production incident

This would be used to prevent an application deploy during an infrastructure outage, to make sure existing pods
continue running.

1. DevOps receives an alert and declares an incident for the `apps/production/a` cluster
2. The first responder runs `deploy-lock lock apps/production --type incident --duration 6h`
   1. This locks _both_ production clusters while we shift traffic to the working one
3. Someone merges code into `main` of `auth-app`
   1. The `auth-app` pipeline runs a deploy job
   2. The deploy job calls `deploy-lock check apps/production/a/auth-app`, which recursively checks:
      1. `apps`
      2. `apps/production`
         1. locked by incident, exit with an error
      3. `apps/production/a`
      4. `apps/production/a/auth-app`
   3. Deploy job exits with an error, _does not_ deploy
4. Incident is resolved
   1. First responder runs `deploy-lock unlock apps/production --type incident`
5. Retry `auth-app` deploy job
   1. No lock, runs normally

#### Prevent duplicate deploys of the same service from conflicting

This would be used to prevent multiple simultaneous deploys of the same project from conflicting with one another, in
a service without ephemeral environments/branch switching.

1. Someone starts a pipeline on `feature/foo` of `chat-app`
   1. The `chat-app` pipeline runs a deploy job
   2. The deploy job calls `deploy-lock lock apps/staging/a/chat-app`
2. Someone else starts a pipeline on `feature/bar` of `chat-app`
   1. The `chat-app` pipeline runs another deploy job
      1. The first one has not finished and is still mid-rollout
   2. The second deploy job calls `deploy-lock lock apps/staging/a/chat-app`, which recursively checks:
      1. `apps`
      2. `apps/staging`
      3. `apps/staging/a`
      4. `apps/staging/a/chat-app`
         1. locked by deploy, exit with an error
      5. `lock` implies `check`
   3. Second deploy job fails with an error, _does not_ deploy
3. First deploy succeeds
   1. Deploy job calls `deploy-lock unlock apps/staging/a/chat-app`
4. Second deploy job can be retried
   1. No lock, runs normally

### Deploy Path

The path to a service, starting with the cluster and environment: `apps/staging/a/auth-app`.

Path components may include:

- cluster
- env (`account`)
- target
- service (namespace)
- branch (`ref`)

When _locking_ a path, only the leaf path is locked, not parents.

When _checking_ a path, each segment is checked recursively, so a lock at `apps/staging` will prevent all services
from being deployed into both the `apps/staging/a` and `apps/staging/b` clusters.

- cluster comes first because that is how we structure the git repositories (repo = cluster, branch = env)
- to lock multiple clusters in the same environment, run the command repeatedly with the same lock data
- to lock a specific branch, put it in the path: `apps/staging/a/auth-app/main`

Ultimately, the deploy path's layout should follow the hierarchy of resources that you want to lock. One potential
order, for a multi-cloud Kubernetes architecture, is:

- cloud
- account
- region
- network
- cluster
- namespace
- resource name

Such as `aws/staging/us-east-1/apps/a/auth-app/api` or `gcp/production/us-east4-a/tools/gitlab/runner/ci`.

Including the region in the path can be limiting, but also allows locking an entire provider-region in case of serious
upstream incidents.

### Lock Data

Each lock must contain the following fields:

```typescript
interface Lock {
  type: 'automation' | 'deploy' | 'freeze' | 'incident' | 'maintenance';
  path: string;
  author: string;
  links: Map<string, string>;

  // Timestamps, calculated from --duration and --until
  created_at: number;
  updated_at: number;
  expires_at: number;

  // Env fields
  // often duplicates of path, but useful for cross-project locks
  env: {
    cluster: string;
    account: string;
    target?: string; // optional
  }

  // CI fields, optional
  ci?: {
    project: string;
    ref: string;
    commit: string;
    pipeline: string;
    job: string;
  }
}
```

If `$CI` is not set, the `ci` sub-struct will not be present.

### Messaging

- create a new lock: `locked ${path} for ${type:friendly} until ${expires_at:datetime}`
  - > Locked `apps/acceptance/a` for a deploy until Sat 31 Dec, 12:00
  - > Locked `gitlab/production` for an incident until Sat 31 Dec, 12:00
- error, existing lock: `error: ${path} is locked until ${expires_at:datetime} by ${type:friendly} in ${cluster}/${env}`
  - > Error: `apps/acceptance` is locked until Sat 31 Dec, 12:00 by an automation run in `testing/staging`.

#### Friendly Types

Friendly strings for `type`:

- `automation`: `An automation run`
- `deploy`: `A deploy`
- `freeze`: `A release freeze`
- `incident`: `An incident`
- `maintenance`: `A maintenance window`

### Command-line Interface

```shell
> deploy-lock check --path apps/staging/a/auth-app   # is equivalent to
> deploy-lock check --path apps --path apps/staging --path apps/staging/a --path apps/staging/a/auth-app
> deploy-lock check --path apps/staging/a/auth-app --recursive=false   # only checks the leaf node

> deploy-lock list --path apps/staging    # list all locks within the apps/staging path

> deploy-lock lock --path apps/staging --type automation --duration 60m
> deploy-lock lock --path apps/staging/a/auth-app --type deploy --duration 5m
> deploy-lock lock --path apps/staging --until 2022-12-31T12:00   # local TZ, unless Z specified

> deploy-lock prune --path apps/staging   # prune expired locks within the path
> deploy-lock prune --path apps/staging --now future-date   # prune locks that will expire by --now

> deploy-lock unlock --path apps/staging --type automation    # unlock type must match lock type
```

#### Basic Options

- command
  - one of `check`, `list`, `lock`, `prune`, `unlock`
- `--now`
  - number, optional
  - defaults to current epoch time
- `--path`
  - array, strings
  - record paths
  - always lowercase (force in code)
  - `/^[-a-z\/]+$/`
- `--recursive`
  - boolean
  - recursively check locks
  - defaults to true for `check`
  - defaults to false for `lock`, `unlock`
- `--type`
  - string, enum
  - type of lock
  - one of `automation`, `deploy`, `freeze`, `incident`, or `maintenance`

#### Lock Data Options

- `--author`
  - string
  - defaults to `$GITLAB_USER_EMAIL` if `$GITLAB_CI` is set
  - defaults to `$USER` otherwise
- `--duration`
  - string
  - duration of lock, relative to now
  - mutually exclusive with `--until`
- `--link`
  - array, strings
- `--until`
  - string, timestamp
  - duration of lock, absolute
  - mutually exclusive with `--duration`
- `--env-cluster`
  - string, enum
  - defaults to `$CLUSTER_NAME` if set
  - defaults to `--path.split.0` otherwise
- `--env-account`
  - string, enum
  - defaults to `$DEPLOY_ENV` if set
  - defaults to `--path.split.1` otherwise
- `--env-target`
  - optional string
  - `/^[a-z]$/`
  - defaults to `$DEPLOY_TARGET` if set
  - defaults to `--path.split.2` otherwise
- `--ci-project`
  - optional string
  - project path
  - defaults to `$CI_PROJECT_PATH` if set
  - defaults to `--path.split.3` otherwise
- `--ci-ref`
  - optional string
  - branch or tag
  - defaults to `$CI_COMMIT_REF_SLUG` if set
  - defaults to `--path.split.4` otherwise
- `--ci-commit`
  - optional string
  - SHA of ref
  - defaults to `$CI_COMMIT_SHA` if set
- `--ci-pipeline`
  - optional string
  - pipeline ID
  - defaults to `$CI_PIPELINE_ID` if set
- `--ci-job`
  - optional string
  - job ID
  - defaults to `$CI_JOB_ID` if set

#### Storage Backend Options

- `--storage`
  - string
  - one of `dynamodb`, `memory`
- `--region`
  - string, optional
  - DynamoDB region name
- `--table`
  - string
  - DynamoDB table name
- `--endpoint`
  - string, optional
  - DynamoDB endpoint
  - set to `http://localhost:8000` for testing with https://hub.docker.com/r/amazon/dynamodb-local
- `--fake`
  - string, optional
  - a fake lock that should be added to the in-memory data store
  - the in-memory data store always starts empty

### REST API

#### Endpoints

- `/locks GET`
  - equivalent to `deploy-lock list`
- `/locks DELETE`
  - equivalent to `deploy-lock prune`
- `/locks/:path DELETE`
  - equivalent to `deploy-lock unlock`
- `/locks/:path GET`
  - equivalent to `deploy-lock check`
- `/locks/:path PUT`
  - equivalent to `deploy-lock lock`

### Questions

1. In the [deploy path](#deploy-path), should account come before network or network before account?
   1. `aws/apps/staging` vs `aws/staging/apps`
2. Should there be an `update` or `replace` command?
3. Should `--recursive` be available for `lock` and `unlock`, or only `check`?
   1. a recursive lock would write multiple records
   2. a recursive unlock could delete multiple records
4. Should locks have multiple authors?
   1. It doesn't make sense to have more than one lock for the same path
   2. But having multiple authors would allow for multi-party locks
      1. for CI: `[gitlab, $GITLAB_USER_NAME]`
      2. for an incident: `[first-responder, incident-commander]`
   3. Each author has to `unlock` before the lock is removed/released
5. Should `LockData.env` be a string/array, like `.path`?

### Testing

1. Launch DynamoDB Local with `podman run --rm -p 8000:8000 docker.io/amazon/dynamodb-local`
2. Create a profile with `aws configure --profile localddb`
   1. placeholder tokens (`foo` and `bar` is fine)
   2. us-east-1 region
   3. json output
3. Create a `locks` table with `aws dynamodb --endpoint-url http://localhost:8000 --profile localddb create-table --attribute-definitions 'AttributeName=path,AttributeType=S' --table-name locks --key-schema 'AttributeName=path,KeyType=HASH' --billing-mode PAY_PER_REQUEST`
4. Run commands using `AWS_PROFILE=localddb deploy-lock --storage dynamo --table locks --endpoint http://localhost:8000 ...`
