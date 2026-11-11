import { defineConfig } from 'drizzle-kit';
import { DATABASE_CASING } from '@oxy.so/db';

/**
 * drizzle-kit configuration.
 *
 * `bun run db:generate` diffs `src/db/schema.ts` against `drizzle/` and writes
 * a new SQL migration. It never opens a database. Migrations are APPLIED by
 * `bun run db:migrate --target-database=<name>` (`src/db/migrate.ts`, through
 * `@oxy.so/db/migrate`). A generated file has no deploy-phase marker: add
 * `-- oxy:deploy-phase=pre` (additive) or `post` (drops, renames) as its first
 * line, or the migrator refuses to apply it.
 *
 * `casing` decides what the DDL CREATES; `createDatabase()` in
 * `src/db/postgres.ts` reads the same `DATABASE_CASING` and decides what
 * queries REFERENCE. Both come from `@oxy.so/db` so they cannot drift apart.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is required by drizzle-kit. Start a local Postgres with:\n' +
      '  bun run db:up\n' +
      'then set DATABASE_URL in packages/backend/.env.',
  );
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  casing: DATABASE_CASING,
  strict: true,
  verbose: true,
  dbCredentials: { url },
});
