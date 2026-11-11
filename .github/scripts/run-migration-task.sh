#!/usr/bin/env bash
#
# Run Willo's Postgres migration as a one-shot ECS task and fail if it did
# not succeed.
#
# Runs `packages/backend/src/db/migrate.ts` (`@oxy.so/db/migrate`) as a
# one-shot ECS task for ONE deploy phase: `pre` (additive migrations, before the
# rollout, while the old image still serves) or `post` (migrations that take
# something away, after the new image is live). Each migration declares its
# phase on its first line (`-- oxy:deploy-phase=pre|post`). `--target-database`
# makes the migrator refuse to run against any database but Willo's.
#
# The ECS CLI returns 0 as soon as a task is ACCEPTED, so a workflow that
# only checked `run-task`'s exit code would report a green deploy for a
# migration that threw. This script waits for the task to stop and checks
# the CONTAINER's own exit code instead.
#
# The task REUSES the service's live task definition and network
# configuration rather than registering its own, which is what gives the
# migrator the same DATABASE_URL secret, subnets and security groups the
# service has. If the task definition is ever pinned to an immutable image
# tag, this script must register a revision instead, or it will migrate using
# the OLD image.
#
# Environment (set by the workflow):
#   CLUSTER, APP                  from the workflow's `env:` block
#   TASK_DEFINITION               the revision this deploy registered for its image
#   CONTAINER_NAME                the container to override within it
#   NETWORK_CONFIGURATION         the service's awsvpc config, as compact JSON
#   PHASE                         pre | post
#   TARGET_DATABASE               the database the migrator must be connected to
set -euo pipefail

: "${CLUSTER:?CLUSTER is required}"
: "${APP:?APP is required}"
: "${TASK_DEFINITION:?TASK_DEFINITION is required}"
: "${CONTAINER_NAME:?CONTAINER_NAME is required}"
: "${NETWORK_CONFIGURATION:?NETWORK_CONFIGURATION is required}"
: "${PHASE:?PHASE is required (pre or post)}"
: "${TARGET_DATABASE:?TARGET_DATABASE is required}"

# `bun` on the TypeScript SOURCE, not `node` on a compiled entrypoint: this
# image has no compiled JS (see packages/backend/Dockerfile).
OVERRIDES=$(jq -nc \
  --arg name "$CONTAINER_NAME" \
  --arg cmd "cd packages/backend && bun src/db/migrate.ts --target-database=$TARGET_DATABASE --phase=$PHASE" \
  '{containerOverrides: [{name: $name, command: ["sh", "-c", $cmd]}]}')

# The migration runs where the service runs: on its capacity provider
# strategy when it has one (oxy-cluster's EC2 capacity, whose revisions are
# EC2-only), otherwise on its launch type. A hard-coded FARGATE would refuse an
# EC2-only revision and fail the deploy before the rollout.
SERVICE_JSON=$(aws ecs describe-services --cluster "$CLUSTER" --services "$APP" --query 'services[0]' --output json)
STRATEGY=$(jq -c '.capacityProviderStrategy // []' <<<"$SERVICE_JSON")
if [ "$STRATEGY" != "[]" ]; then
  PLACEMENT=(--capacity-provider-strategy "$STRATEGY")
else
  PLACEMENT=(--launch-type "$(jq -r '.launchType // "FARGATE"' <<<"$SERVICE_JSON")")
fi

echo "running the $PHASE migration task on $CLUSTER using $TASK_DEFINITION"
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEFINITION" \
  "${PLACEMENT[@]}" \
  --count 1 \
  --network-configuration "$NETWORK_CONFIGURATION" \
  --overrides "$OVERRIDES" \
  --started-by "deploy-migration-$PHASE" \
  --query 'tasks[0].taskArn' --output text)

if [ -z "$TASK_ARN" ] || [ "$TASK_ARN" = "None" ]; then
  echo "::error::the migration task was not accepted by ECS"
  exit 1
fi
echo "task: $TASK_ARN"

aws ecs wait tasks-stopped --cluster "$CLUSTER" --tasks "$TASK_ARN"

# Read the exit code of the container we overrode BY NAME. Indexing [0] would
# silently read a sidecar's status if one is ever added to the task definition.
EXIT_CODE=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query "tasks[0].containers[?name=='$CONTAINER_NAME'].exitCode | [0]" --output text)
STOP_REASON=$(aws ecs describe-tasks --cluster "$CLUSTER" --tasks "$TASK_ARN" \
  --query 'tasks[0].stoppedReason' --output text)

# A container that never started has NO exit code — `None`, not 0. Treating
# that as success is the single easiest way to ship an unmigrated database,
# so it is handled before the numeric comparison rather than falling into it.
if [ "$EXIT_CODE" = "None" ] || [ -z "$EXIT_CODE" ]; then
  echo "::error::the migration container never ran (stoppedReason: $STOP_REASON)"
  exit 1
fi

if [ "$EXIT_CODE" != "0" ]; then
  echo "::error::the migration failed with exit code $EXIT_CODE (stoppedReason: $STOP_REASON)"
  echo "::error::logs: /oxy/ecs, stream prefix $APP — the migrator prints what it applied and why it failed"
  exit 1
fi

echo "migration completed"
