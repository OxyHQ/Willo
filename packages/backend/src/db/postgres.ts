/**
 * PostgreSQL connection — Drizzle ORM over postgres.js
 * (`drizzle-orm/postgres-js`), built through `@oxy.so/db`'s `createDatabase()`
 * exactly as `OxyHQ/Mention`'s `src/db/postgres.ts` does. Connect once at
 * boot (`connectPostgres`), then read the handle synchronously from anywhere
 * via `getDb()`.
 */

import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type postgres from 'postgres';
import { createDatabase } from '@oxy.so/db';
import { config } from '../config';
import * as schema from './schema';

/** Seconds `closePostgres` waits for in-flight queries before forcing the socket shut. */
const CLOSE_TIMEOUT_SECONDS = 5;

export type Database = PostgresJsDatabase<typeof schema>;

let db: Database | null = null;
let client: postgres.Sql | null = null;

/**
 * Open the connection pool. Call once during startup, before serving
 * traffic. Idempotent: a second call returns the existing handle rather than
 * opening a second pool.
 */
export async function connectPostgres(): Promise<Database> {
  if (db) return db;

  // `createDatabase` guarantees this handle is built with `DATABASE_CASING`,
  // matching what `drizzle.config.ts` used to generate the migrations —
  // otherwise queries would reference columns the migrations never created.
  const created = createDatabase({
    databaseUrl: config.databaseUrl,
    schema,
  });

  // postgres.js connects lazily, so constructing the pool proves nothing.
  // Issue a real round trip so an unreachable/misconfigured database fails
  // during startup instead of on the first request.
  try {
    await created.client`select 1`;
  } catch (error) {
    await created.client.end({ timeout: CLOSE_TIMEOUT_SECONDS });
    throw error;
  }

  client = created.client;
  db = created.db;
  return db;
}

/**
 * The connection opened by `connectPostgres()`.
 *
 * @throws {Error} If called before `connectPostgres()` resolved — a
 *   programming error, not a runtime condition to recover from.
 */
export function getDb(): Database {
  if (!db) {
    throw new Error('PostgreSQL is not connected. Call connectPostgres() during startup before issuing queries.');
  }
  return db;
}

/** Close the pool (for shutdown hooks and test teardown). Safe to call when never connected. */
export async function closePostgres(): Promise<void> {
  const instanceClient = client;
  if (!instanceClient) return;
  client = null;
  db = null;
  await instanceClient.end({ timeout: CLOSE_TIMEOUT_SECONDS });
}
