/**
 * Apply the SQL migrations in `drizzle/` to `DATABASE_URL`.
 *
 * A small, single-writer script rather than a port of OxyHQ/Mention's
 * `migrate.ts`: this service has one migration, no production deploy
 * pipeline yet, and nothing to defer — so there is no ledger-safety,
 * dry-run, or target-database guard here. It uses drizzle-orm's own
 * postgres-js migrator directly, which is the standard, idempotent way to
 * run this: already-applied migrations are skipped.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from '../config';

async function main(): Promise<void> {
  // `max: 1` — migrations are one serial stream of DDL; a pool would buy
  // nothing and would let statements interleave across connections.
  const client = postgres(config.databaseUrl, { max: 1 });
  try {
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    console.log('Postgres migrations applied.');
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Postgres migration failed:', error);
  process.exitCode = 1;
});
