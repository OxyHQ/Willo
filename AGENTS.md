# Willo

Smart home control by Oxy: an Expo app (iOS, Android, web) over a user's own Home Assistant, a Bun/Postgres backend, and the Frame photo-frame app. Bun monorepo.

## Commands

```bash
bun install                      # pinned Bun is in package.json "packageManager"
bun start                        # frontend dev server (also: web, android, ios)
bun run lint                     # Biome + Expo ESLint for frontend and frame
bun run lint:fix                 # Biome autofix; bun run format formats only
bun run typecheck                # all five packages
bun test ./tests                 # repo-level tests
bun run --cwd packages/backend test      # backend tests (needs Postgres, below)
bun run --cwd packages/backend db:up     # local Postgres; db:migrate applies migrations
bun run i18n:check               # translation keys
bun run doctor:oxy               # Oxy dependency health
```

## Map

- `packages/frontend`: the app. `packages/frame`: photo frame (web and Android APK). `packages/backend`: API and `/homes` socket. `packages/ui`: app-agnostic UI. `packages/shared-types`: shared types.
- `tests/`: repo-level tests, including workflow and pin gates. `.github/scripts/reviewed-image.py`: production image pin.
- Nested `AGENTS.md` in `packages/frontend`, `packages/frame` and `packages/ui` carry package-specific rules; read the one for the package you edit.
- Backend env: `packages/backend/.env.example`. Android signing and Oxy product identity: [README](./README.md).

## Conventions that differ from defaults

- Use `bun`/`bunx`, never npm or yarn; commit `bun.lock` with the `package.json` change that caused it (CI installs with `--frozen-lockfile`).
- Keep Home Assistant auth and Oxy sign-in separate; the app must work without an Oxy account (see `packages/frontend/AGENTS.md`).
- `packages/ui` never imports from `packages/frontend` and uses relative imports only (see `packages/ui/AGENTS.md`).
- Backend `DATABASE_URL`, Oxy API URL and the tunnel claim key come from environment variables; add new ones to `.env.example` without values.
- Own-product Oxy calls use the shared workload/session transport: no customer API key, app scope or consent screen.
- General Oxy code, TypeScript, React and error-handling rules: [Oxy engineering standards](https://github.com/OxyHQ/engineering/blob/main/AGENTS.md). Biome and the Expo ESLint config enforce the formatting subset.

## Boundaries

- Never edit a Dockerfile, `.dockerignore`, workflow or `.github/scripts/reviewed-images.json` without owner review: they decide what production runs (CODEOWNERS). After a Dockerfile or `.dockerignore` change run `python3 .github/scripts/reviewed-image.py pin` or the PR gate fails.
- Never publish packages or ship native builds from a laptop; releases go through the workflows in `.github/workflows/`.
- Ask first before changing a database migration already on main: add a new one with `bun run --cwd packages/backend db:generate`.

## Testing

- Change in `packages/backend`: backend tests against the local Postgres. Any other change: `bun run lint`, `bun run typecheck`, `bun test ./tests`.
- Done means those pass as CI runs them (`ui-checks.yml`, `backend-tests.yml`); UI changes are also checked in a real browser or device build.

## Pull requests

- Imperative commit messages that say why; one logical change per commit; PR title under 70 characters, body says what, why and how tested.
- Branch from `origin/main`; `main` requires the `protect` ruleset checks. Never force-push a shared branch.

## Secrets

- Never commit `.env` or print its values. Android signing keys come from Gradle properties (README); workflow secrets live in GitHub Actions.

## Links

- [Oxy engineering standards](https://github.com/OxyHQ/engineering/blob/main/AGENTS.md)
- [Lint and format](https://github.com/OxyHQ/oxy/blob/main/docs/engineering/lint-and-format.md)
- [Build and runtime traps](https://github.com/OxyHQ/oxy/blob/main/docs/engineering/build-and-runtime-traps.md)
- [Native Android releases](https://github.com/OxyHQ/oxy/blob/main/docs/engineering/build-and-deploy.md)
- [Bloom app conventions](https://github.com/OxyHQ/Bloom/blob/main/docs/app-conventions.mdx)
- [Responsive UI review](./docs/responsive-ui-review.md)

Owner: Nate Isern (@NateIsern). Last reviewed: 2026-11-11.
