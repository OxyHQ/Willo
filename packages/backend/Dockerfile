# syntax=docker/dockerfile:1
#
# Willo backend image (@willo/backend).
#
# Bun-native: runs its TypeScript entrypoint directly under Bun
# (`bun packages/backend/src/server.ts`, matching the package's own `start`
# script `bun src/server.ts`, invoked here from the repo root) — there is no
# compiled JS entrypoint. `packages/backend/package.json` has no `build`
# script; `bun run typecheck` (`tsc --noEmit`) is used below only as a
# build-time safety GATE, and its output (nothing — `--noEmit`) is discarded.
#
# Built for AWS Graviton (linux/arm64); the deploy workflow runs on an arm64
# runner so the image is native arm64 (no QEMU emulation). The build context
# MUST be the monorepo ROOT so the workspace packages and the hoisted
# node_modules resolve (bunfig.toml pins `linker = "hoisted"`):
#
#   docker build -f packages/backend/Dockerfile -t willo-backend .
#
# Runtime configuration comes from the environment. ECS injects DATABASE_URL
# — which the service cannot boot without, see src/config/index.ts, which
# refuses to load without it — and, once Oxy issues Willo an application
# credential, OXY_SERVICE_API_KEY / OXY_SERVICE_API_SECRET (ecosystem-activity
# telemetry; the service runs fine without them — see src/ecosystemActivity.ts)
# from SSM `/oxy/willo/*`. Non-secret config (PORT, OXY_API_URL, CORS_ORIGINS)
# is set as plain task-definition env. See .github/workflows/deploy-aws.yml.

# ── Stage 1: build (install deps, type-gate the backend) ────────────────────
FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app

# Workspace root files. This repo has no root tsconfig.json (only a
# tsconfig.json per package), so none is copied here.
COPY package.json bun.lock bunfig.toml ./

# Every workspace member's package.json must be present for bun's
# frozen-lockfile install to reconcile — even packages this image does not
# run (frontend, ui). That is not just bookkeeping here: packages/backend's
# own tsconfig.json extends `@oxy.so/app-preset/tsconfig/backend.json`, but
# @oxy.so/app-preset is declared as a dependency of packages/frontend and
# packages/ui, NOT of packages/backend — it only resolves for the backend
# because bun's hoisted linker installs it once at the shared root
# node_modules. Without frontend/ui's manifests here, that package is never
# installed and the typecheck gate below fails to resolve the extends target.
COPY packages/backend/package.json packages/backend/
COPY packages/frontend/package.json packages/frontend/
COPY packages/ui/package.json packages/ui/

# Install the full workspace, including dev tooling (typescript, @types/*).
# --ignore-scripts: unlike Peable, this repo's root package.json has no
# postinstall script to route around — there simply isn't one. Nothing the
# backend needs runs an install-time script either, so this stays a cheap
# supply-chain default: no third-party package (root package.json already
# narrows this with its own `trustedDependencies` allowlist) gets to run
# arbitrary code during the image build.
RUN bun install --frozen-lockfile --ignore-scripts

# Copy only what the typecheck gate needs — not the whole packages/backend/
# directory, which also holds docker-compose.postgres.yml, drizzle.config.ts,
# and a locally gitignored .env that must never reach a Docker layer.
COPY packages/backend/tsconfig.json packages/backend/
COPY packages/backend/src/ packages/backend/src/

# Type-safety gate: `tsc --noEmit` (packages/backend's own `typecheck`
# script). Its output is discarded — the runtime stage below runs the TS
# source directly under Bun.
RUN cd packages/backend && bun run typecheck

# ── Stage 2: runtime ──────────────────────────────────────────────────────
FROM oven/bun:1.3.14-alpine AS runtime
WORKDIR /app

# Drop privileges: run as a dedicated non-root user.
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=builder /app/package.json /app/bun.lock /app/bunfig.toml ./

# Every workspace member's package.json is required for the frozen-lockfile
# production install to reconcile, even in the runtime image.
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/frontend/package.json packages/frontend/
COPY --from=builder /app/packages/ui/package.json packages/ui/

# The backend TS source (run directly under Bun — no compiled entrypoint) and
# its tsconfig, plus the SQL migrations `bun run db:migrate` applies at
# deploy time (see .github/scripts/run-migration-task.sh). drizzle.config.ts
# is deliberately NOT copied: it is only used by `drizzle-kit generate`, a
# developer-time command this image never runs.
COPY --from=builder /app/packages/backend/src/ packages/backend/src/
COPY --from=builder /app/packages/backend/tsconfig.json packages/backend/
COPY packages/backend/drizzle/ packages/backend/drizzle/

# Production dependencies only. --ignore-scripts for the same reason as the
# builder stage's install.
RUN bun install --frozen-lockfile --production --ignore-scripts

ENV NODE_ENV=production
USER appuser

# config/index.ts: PORT (default 4200). ECS maps this container port to the
# ALB target group. No Dockerfile HEALTHCHECK: liveness is enforced by the
# ALB target-group health check (terraform) against the existing GET /health
# route (app.ts) — a shallow liveness check with no DB probe today.
EXPOSE 4200

CMD ["bun", "packages/backend/src/server.ts"]
