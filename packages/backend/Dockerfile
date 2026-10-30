# syntax=docker/dockerfile:1.27@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
#
# Willo backend image (@willo.sh/backend).
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
# refuses to load without it — from SSM `/oxy/willo/*`. Ecosystem-activity
# telemetry needs no variable: on ECS it attests the task role (oxy ADR 0026;
# see src/ecosystemActivity.ts). Non-secret config (PORT, OXY_API_URL, CORS_ORIGINS)
# is set as plain task-definition env. SSM is the only copy of each secret;
# nothing in .github/workflows writes one (oxy-infra runbook 46).
#
# Every base image, and the `syntax` frontend on line 1, is pinned by its
# multi-arch index digest after the tag (`tag@sha256:...`). A tag is mutable:
# a re-pushed `oven/bun:1.4.3-alpine` would change what this file builds
# without changing one byte of it, and this file's bytes, with .dockerignore,
# are what .github/scripts/reviewed-images.json pins (reviewed-image.py). The
# tag stays for readers and for tests/bun-pin.test.ts; the digest is what the
# build uses. Bumping a base image means a new tag AND its index digest
# (`docker buildx imagetools inspect <image>:<tag>`), and a re-review.

# ── Stage 1: build (install deps, type-gate the backend) ────────────────────
FROM oven/bun:1.4.3-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS builder
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
COPY packages/shared-types/package.json packages/shared-types/
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
# The frame vocabularies the backend validates against (FRAME_CARDS, ...).
COPY packages/shared-types/ packages/shared-types/

# Type-safety gate: `tsc --noEmit` (packages/backend's own `typecheck`
# script). Its output is discarded — the runtime stage below runs the TS
# source directly under Bun.
RUN cd packages/backend && bun run typecheck

# ── Stage 2: runtime ──────────────────────────────────────────────────────
FROM oven/bun:1.4.3-alpine@sha256:629e17411f1f129dbec3af78d5af9c9f2a937435c80349437206c6b0b7422373 AS runtime
WORKDIR /app

# Drop privileges: run as a dedicated non-root user.
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup

COPY --from=builder /app/package.json /app/bun.lock /app/bunfig.toml ./

# Every workspace member's package.json is required for the frozen-lockfile
# production install to reconcile, even in the runtime image.
COPY --from=builder /app/packages/backend/package.json packages/backend/
COPY --from=builder /app/packages/frontend/package.json packages/frontend/
COPY --from=builder /app/packages/shared-types/package.json packages/shared-types/
COPY --from=builder /app/packages/ui/package.json packages/ui/

# Production dependencies only. --ignore-scripts for the same reason as the
# builder stage's install. It runs from the manifests and lockfile alone,
# BEFORE the source is copied, so a source-only change reuses this layer from
# the build cache.
RUN bun install --frozen-lockfile --production --ignore-scripts

# The backend TS source (run directly under Bun — no compiled entrypoint) and
# its tsconfig, plus the SQL migrations `bun run db:migrate` applies at
# deploy time (see .github/scripts/run-migration-task.sh). drizzle.config.ts
# is deliberately NOT copied: it is only used by `drizzle-kit generate`, a
# developer-time command this image never runs.
COPY --from=builder /app/packages/backend/src/ packages/backend/src/
COPY --from=builder /app/packages/backend/tsconfig.json packages/backend/
COPY --from=builder /app/packages/shared-types/src/ packages/shared-types/src/
COPY packages/backend/drizzle/ packages/backend/drizzle/

ENV NODE_ENV=production
USER appuser

# config/index.ts: PORT (default 4200). ECS maps this container port to the
# ALB target group. No Dockerfile HEALTHCHECK: liveness is enforced by the
# ALB target-group health check (terraform) against the existing GET /health
# route (app.ts) — a shallow liveness check with no DB probe today.
EXPOSE 4200

CMD ["bun", "packages/backend/src/server.ts"]
