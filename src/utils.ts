/* eslint-disable camelcase */
import { doesExist, mustDefault } from '@apextoaster/js-utils';

import { ParsedArgs } from './args.js';
import { LOCK_TYPES, LockCI, LockData, LockEnv } from './lock.js';

export function splitPath(path: string): Array<string> {
  const segments = path.split('/');

  const paths = [];
  for (let i = 1; i <= segments.length; ++i) {
    const next = segments.slice(0, i).join('/');
    paths.push(next);
  }

  return paths;
}

export const ENV_UNSET = 'not found';

export function buildCI(args: ParsedArgs, env: typeof process.env): LockCI | undefined {
  if (doesExist(env.GITLAB_CI)) {
    return {
      project: mustDefault(args['ci-project'], env.CI_PROJECT_PATH, ENV_UNSET),
      ref: mustDefault(args['ci-ref'], env.CI_COMMIT_REF_SLUG, ENV_UNSET),
      commit: mustDefault(args['ci-commit'], env.CI_COMMIT_SHA, ENV_UNSET),
      pipeline: mustDefault(args['ci-pipeline'], env.CI_PIPELINE_ID, ENV_UNSET),
      job: mustDefault(args['ci-job'], env.CI_JOB_ID, ENV_UNSET),
    };
  }

  return undefined;
}

export function buildEnv(args: ParsedArgs, env: typeof process.env): LockEnv {
  return {
    cluster: mustDefault(args['env-cluster'], env.CLUSTER_NAME, ENV_UNSET),
    account: mustDefault(args['env-account'], env.DEPLOY_ENV, ENV_UNSET),
    target: mustDefault(args['env-target'], env.DEPLOY_TARGET, ENV_UNSET),
  };
}

export function buildAuthor(args: ParsedArgs, env: typeof process.env): string {
  if (doesExist(env.GITLAB_CI)) {
    return mustDefault(args.author, env.GITLAB_USER_EMAIL, env.USER);
  }

  return mustDefault(args.author, env.USER);
}

export function buildLinks(args: ParsedArgs): Record<string, string> {
  const links: Record<string, string> = {};

  for (const link of args.links) {
    const match = /^([-a-z]+):(.+)$/.exec(link);
    if (doesExist(match)) {
      const [_full, name, url] = Array.from(match);
      links[name] = url;
    }
  }

  return links;
}

export function buildLock(args: ParsedArgs, env = process.env): LockData {
  return {
    type: mustDefault(args.type, 'deploy'),
    path: args.path,
    author: buildAuthor(args, env),
    links: buildLinks(args),
    created_at: 0,
    updated_at: 0,
    expires_at: 0,
    env: buildEnv(args, env),
    ci: buildCI(args, env),
  };
}

export function printLock(path: string, data: LockData): string {
  const friendlyType = LOCK_TYPES[data.type];
  return `${path} is locked until ${data.expires_at} by ${friendlyType} in ${data.env.cluster}`;
}
