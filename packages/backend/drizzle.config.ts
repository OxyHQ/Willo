import { defineConfig } from 'drizzle-kit';
import { DATABASE_CASING } from '@oxy.so/db';

/**
 * drizzle-kit configuration.
 *
 * `bun run db:generate` diffs `src/db/schema.ts` against `drizzle/` and writes
 * a new SQL migration. It never opens a database. Migrations are APPLIED by
 * `bun run db:migrate` (`src/db/migrate.ts`), which uses drizzle-orm's own
 * migrator over the files in `drizzle/` — this small a service has no
 * production deploy pipeline yet, so unlike OxyHQ/Mention's `migrate.ts`
 * there is no deferred-ledger/dry-run/target-database machinery here to keep
 * in sync with it.
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
      'then set DATABASE_URL in packages/backend/.env.'
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
