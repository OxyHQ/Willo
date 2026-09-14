#!/usr/bin/env bash
#
# Run Willo's Postgres migration as a one-shot ECS task and fail if it did
# not succeed.
#
# ── Why there is no pre/post phase split here, unlike Peable/Mention/Nilo ──
#
# Those services' migrators accept `--phase=pre|post` (and `--target-database`)
# so a destructive change can wait until the OLD image has stopped serving.
# `packages/backend/src/db/migrate.ts` has no such concept — its own header
# says so directly: this is a small service with "no production deploy
# pipeline yet, and nothing to defer... there is no ledger-safety, dry-run, or
# target-database guard here." Building that pipeline is what THIS workflow
# does for the first time, so there is deliberately only ONE migration run,
# always BEFORE the rollout (safe today: the one existing migration is
# additive, and drizzle's migrator skips migrations already applied). If a
# future migration ever needs a pre/post split — an old image that must keep
# working against a new schema mid-rollout — `migrate.ts` needs that
# capability added FIRST; this script cannot invent a safety property the
# migrator does not have.
#
# ── Everything below this point mirrors Peable's own run-migration-task.sh ──
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
#   TASK_DEFINITION               the service's live task definition ARN
#   CONTAINER_NAME                the container to override within it
#   NETWORK_CONFIGURATION         the service's awsvpc config, as compact JSON
set -euo pipefail

: "${CLUSTER:?CLUSTER is required}"
: "${APP:?APP is required}"
: "${TASK_DEFINITION:?TASK_DEFINITION is required}"
: "${CONTAINER_NAME:?CONTAINER_NAME is required}"
: "${NETWORK_CONFIGURATION:?NETWORK_CONFIGURATION is required}"

# `bun` on the TypeScript SOURCE, not `node` on a compiled entrypoint — this
# image has no compiled JS at all (see packages/backend/Dockerfile); its CMD
# is `bun packages/backend/src/server.ts`, with `bun run typecheck` used only
# as a build-time gate whose output is discarded.
#
# `migrate.ts` resolves its migrations folder as the RELATIVE path
# `./drizzle` (matching how it is always run locally: `bun run db:migrate`
# from inside packages/backend), which resolves against the process's
# working directory, not the script's own location. The image's WORKDIR is
# the repo root, so the command below `cd`s into packages/backend first —
# skipping that would have `./drizzle` resolve to a directory that does not
# exist in the image and fail with "Can't find meta/_journal.json file".
OVERRIDES=$(jq -nc \
  --arg name "$CONTAINER_NAME" \
  '{containerOverrides: [{name: $name, command: ["sh", "-c", "cd packages/backend && bun src/db/migrate.ts"]}]}')

echo "running migration task on $CLUSTER using $TASK_DEFINITION"
TASK_ARN=$(aws ecs run-task \
  --cluster "$CLUSTER" \
  --task-definition "$TASK_DEFINITION" \
  --launch-type FARGATE \
  --count 1 \
  --network-configuration "$NETWORK_CONFIGURATION" \
  --overrides "$OVERRIDES" \
  --started-by "deploy-migration" \
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
