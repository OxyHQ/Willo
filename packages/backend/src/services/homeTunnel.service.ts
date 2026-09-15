/**
 * The Home Assistant tunnel: pairing (turning a short human-typed code into a
 * long-lived per-Home secret), tunnel authentication, and the cached device
 * snapshot every Home's tunnel connection keeps fresh — see `schema.ts`'s
 * `homeConnections` doc comment for the full row lifecycle this file drives.
 */

import { createHash, randomBytes, randomInt } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeConnections, homes } from '../db/schema';
import { HOME_CONNECTION_DISPLAY_COLUMNS } from '../db/homeConnectionColumns';
import { NotFoundError } from '../errors';
import { assertActiveMember, assertActiveOwner } from './homes.service';
import { isHomeConnected } from '../realtime/tunnelRegistry';

/** Excludes 0/O and 1/I/L — read aloud or typed off a small screen, those are the pairs people actually get wrong. */
const PAIRING_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PAIRING_CODE_LENGTH = 8;
const PAIRING_CODE_TTL_MS = 15 * 60 * 1000;

function generatePairingCode(): string {
  let code = '';
  for (let index = 0; index < PAIRING_CODE_LENGTH; index += 1) {
    code += PAIRING_CODE_ALPHABET[randomInt(PAIRING_CODE_ALPHABET.length)];
  }
  return code;
}

/** 256 bits of randomness — high enough entropy that a fast hash (below) is the correct choice, not a slow password hash meant to resist guessing a LOW-entropy human secret. */
function generateTunnelSecret(): string {
  return randomBytes(32).toString('base64url');
}

function hashSecret(secret: string): string {
  return createHash('sha256').update(secret).digest('hex');
}

export interface IssuedPairingCode {
  code: string;
  expiresAt: Date;
}

/**
 * Owner-only. Replaces any previous pairing code AND any existing tunnel
 * secret — issuing a new code is how an owner re-pairs a Home (a factory
 * reset, a replaced HA Green unit), so the old secret must stop working the
 * moment a new code is issued, not linger as a second valid credential.
 */
export async function issuePairingCode(homeId: string, userId: string): Promise<IssuedPairingCode> {
  await assertActiveOwner(homeId, userId);

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

  await getDb()
    .insert(homeConnections)
    .values({ homeId, provider: 'home_assistant', pairingCode: code, pairingCodeExpiresAt: expiresAt })
    .onConflictDoUpdate({
      target: [homeConnections.homeId],
      set: { pairingCode: code, pairingCodeExpiresAt: expiresAt, tunnelSecretHash: null },
    });

  return { code, expiresAt };
}

export interface CompletedPairing {
  homeId: string;
  /** Returned ONCE. Not persisted anywhere in plaintext — see `tunnelSecretHash`. */
  secret: string;
}

/**
 * Called by the Home Assistant integration itself, authenticated by the code
 * alone (there is no Oxy session on this side) — see `routes/tunnel.routes.ts`.
 * Single-use: the code is cleared the moment it's consumed, successfully or not.
 */
export async function completePairing(code: string): Promise<CompletedPairing> {
  const normalized = code.trim().toUpperCase();

  const [row] = await getDb()
    .select({ id: homeConnections.id, homeId: homeConnections.homeId, pairingCodeExpiresAt: homeConnections.pairingCodeExpiresAt })
    .from(homeConnections)
    .where(eq(homeConnections.pairingCode, normalized))
    .limit(1);

  if (!row || !row.pairingCodeExpiresAt || row.pairingCodeExpiresAt.getTime() < Date.now()) {
    throw new NotFoundError('This pairing code is invalid or has expired.');
  }

  const secret = generateTunnelSecret();
  await getDb()
    .update(homeConnections)
    .set({ tunnelSecretHash: hashSecret(secret), pairingCode: null, pairingCodeExpiresAt: null })
    .where(eq(homeConnections.id, row.id));

  return { homeId: row.homeId, secret };
}

/**
 * THE ONLY FUNCTION IN THIS CODEBASE ALLOWED TO SELECT `tunnelSecretHash`.
 * Called from the `/tunnel` namespace's handshake auth — see
 * `realtime/tunnelNamespace.ts`.
 */
export async function authenticateTunnel(homeId: string, secret: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ tunnelSecretHash: homeConnections.tunnelSecretHash })
    .from(homeConnections)
    .where(eq(homeConnections.homeId, homeId))
    .limit(1);
  if (!row?.tunnelSecretHash) return false;
  return row.tunnelSecretHash === hashSecret(secret);
}

/**
 * `connectedAt` is set only the FIRST time — it means "ever paired and
 * connected," not "connected right now" (that's `isHomeConnected`,
 * in-memory, real-time).
 *
 * The `now` embedded in the `coalesce(...)` template is passed as an ISO
 * string, not a raw `Date` — a `.set({ field: date })` value goes through
 * Drizzle's own column-type encoder, but a value interpolated into a raw
 * `sql` template is bound to the driver as-is, and postgres.js's bind step
 * rejects a bare `Date` (`byteLength` on a `Date` throws `ERR_INVALID_ARG_TYPE`
 * — caught by the tunnel smoke test, not by `tsc`, since nothing here is a
 * type error).
 */
export async function markTunnelConnected(homeId: string): Promise<void> {
  const now = new Date();
  await getDb()
    .update(homeConnections)
    .set({ lastSeenAt: now, connectedAt: sql`coalesce(${homeConnections.connectedAt}, ${now.toISOString()}::timestamptz)` })
    .where(eq(homeConnections.homeId, homeId));
}

export async function markTunnelDisconnected(homeId: string): Promise<void> {
  await getDb().update(homeConnections).set({ lastSeenAt: new Date() }).where(eq(homeConnections.homeId, homeId));
}

/**
 * Upsert, not a bare `update`: a plain `UPDATE ... WHERE home_id = ...`
 * silently matches zero rows (no error) if this Home has never had a
 * `home_connections` row at all, which loses the write with no signal.
 * In the real tunnel flow that row always exists by the time a device event
 * can arrive (pairing creates it — see `issuePairingCode`), but nothing
 * here should depend on that ordering never changing.
 */
export async function saveDeviceSnapshot(homeId: string, devices: unknown[]): Promise<void> {
  await getDb()
    .insert(homeConnections)
    .values({ homeId, provider: 'home_assistant', deviceSnapshot: devices })
    .onConflictDoUpdate({ target: [homeConnections.homeId], set: { deviceSnapshot: devices } });
}

/**
 * Merges ONE changed device into the cached snapshot (mirrors the frontend's
 * own `replaceOrAppend`, `providers/types.ts`) and returns the updated list.
 *
 * KNOWN RACE, accepted for v1: two `state_changed` events for the same Home
 * arriving close enough together can interleave their read-modify-write and
 * lose one update — there is no per-Home serialization here yet. Real HA
 * state churn is far slower than a Postgres round trip in practice; revisit
 * with a per-Home in-memory queue in `tunnelNamespace.ts` if it ever proves
 * otherwise, rather than adding that complexity speculatively.
 */
export async function applyDeviceUpdate(homeId: string, device: { id: string } & Record<string, unknown>): Promise<unknown[]> {
  const [row] = await getDb()
    .select({ deviceSnapshot: homeConnections.deviceSnapshot })
    .from(homeConnections)
    .where(eq(homeConnections.homeId, homeId))
    .limit(1);

  const existing = Array.isArray(row?.deviceSnapshot) ? (row.deviceSnapshot as Array<{ id: string }>) : [];
  const replaced = existing.some((entry) => entry.id === device.id);
  const next = replaced ? existing.map((entry) => (entry.id === device.id ? device : entry)) : [...existing, device];

  // Upsert — see `saveDeviceSnapshot`'s comment; the same silent-no-op risk
  // applies here.
  await getDb()
    .insert(homeConnections)
    .values({ homeId, provider: 'home_assistant', deviceSnapshot: next })
    .onConflictDoUpdate({ target: [homeConnections.homeId], set: { deviceSnapshot: next } });
  return next;
}

export interface LiveDevicesResult {
  connected: boolean;
  /**
   * True once this Home has EVER completed pairing (a tunnel secret exists
   * right now), independent of `connected`. This is the distinction the
   * frontend gates onboarding on: a Home that has never paired belongs on
   * the "enter this code" screen, but one that merely dropped its live
   * connection (a backend restart, a brief network blip, the integration
   * itself restarting) does not — it should render normally, with
   * `connected: false` degrading individual devices, not re-block the whole
   * app behind a setup flow. Conflating the two previously meant any
   * transient disconnect silently re-armed onboarding, which — because the
   * onboarding screen auto-requests a pairing code on mount — actually
   * INVALIDATED the still-good secret a live device was already using.
   */
  paired: boolean;
  devices: unknown[];
  /** The Home's own name (nullable — naming it is optional at creation). Returned here, not a separate call, since the frontend already fetches this endpoint once on every connect/reconnect and needs both. */
  homeName: string | null;
}

/**
 * Any active member. `connected` is live (the registry), `devices` is the
 * last snapshot the tunnel reported — never a synchronous round trip to the
 * home itself. `paired` is computed as `tunnelSecretHash IS NOT NULL` via a
 * raw SQL boolean expression, never a `.select()` of the column itself —
 * `authenticateTunnel` (this same file) remains the only place the hash's
 * actual VALUE is ever read.
 */
export async function getLiveDevices(homeId: string, userId: string): Promise<LiveDevicesResult> {
  await assertActiveMember(homeId, userId);
  const [connectionRow] = await getDb()
    .select({ ...HOME_CONNECTION_DISPLAY_COLUMNS, hasSecret: sql<boolean>`${homeConnections.tunnelSecretHash} is not null` })
    .from(homeConnections)
    .where(eq(homeConnections.homeId, homeId))
    .limit(1);
  const [homeRow] = await getDb().select({ name: homes.name }).from(homes).where(eq(homes.id, homeId)).limit(1);
  return {
    connected: isHomeConnected(homeId),
    paired: connectionRow?.hasSecret ?? false,
    devices: (connectionRow?.deviceSnapshot as unknown[] | null) ?? [],
    homeName: homeRow?.name ?? null,
  };
}
