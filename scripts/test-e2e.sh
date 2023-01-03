#! /bin/bash

ddb_port=8000
ddb_table=locks

# end-to-end tests using a DynamoDB local container
ddb_cid="$(mktemp --dry-run /tmp/deploy-lock-e2e-ddb.XXXXXX)"

function stop_ddb() {
  if [[ -f "${ddb_cid}" ]];
  then
    echo "Stopping existing DDB..."
    podman stop --cidfile "${ddb_cid}" && rm -v "${ddb_cid}"
  fi
}

function start_ddb() {
  echo "Starting DDB..."
  stop_ddb
  podman run \
    --cidfile "${ddb_cid}" \
    --name deploy-lock-e2e-ddb \
    --replace \
    --rm \
    -d \
    -p 8000:${ddb_port} \
    docker.io/amazon/dynamodb-local

  while ! nc -z localhost ${ddb_port}; do
    sleep 1
  done

  echo "DDB started, creating table."

  aws dynamodb \
    --endpoint-url http://localhost:${ddb_port} \
    create-table \
    --attribute-definitions 'AttributeName=path,AttributeType=S' \
    --table-name ${ddb_table} \
    --key-schema 'AttributeName=path,KeyType=HASH' \
    --billing-mode PAY_PER_REQUEST
}

function run_app() {
  echo "Running app with args: $@"

  node out/src/index.js \
    --storage dynamo \
    --table locks \
    --endpoint http://localhost:${ddb_port} \
    --source test/e2e \
    $@

  return $?
}

# scenarios:
echo "1. automation lock before deploy, should prevent the deploy"
start_ddb
run_app lock apps --type automation --duration 5m
run_app check apps/foo --type deploy && exit 1

echo "2. incident lock before deploy, should allow the deploy"
start_ddb
run_app lock apps --type incident --duration 5m --allow deploy
run_app check apps/foo --type deploy || exit 1

echo "3. duplicate deploys, should prevent the deploy"
start_ddb
run_app lock apps --type deploy --duration 5m
run_app check apps/bar --type deploy && exit 1

echo "4. automation during a release freeze, should allow the automation"
start_ddb
run_app lock apps --type freeze --duration 5m --allow automation
run_app check apps/foo --type automation || exit 1

# clean up
stop_ddb
echo "Done, all tests passed."
