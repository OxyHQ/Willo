/**
 * The Home Assistant tunnel: pairing (turning a short human-typed code into a
 * long-lived per-Home secret), tunnel authentication, and the cached device
 * snapshot every Home's tunnel connection keeps fresh — see `schema.ts`'s
 * `homeConnections` doc comment for the full row lifecycle this file drives.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes, randomInt } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { deviceClaims, homeConnections, homes } from '../db/schema';
import { HOME_CONNECTION_DISPLAY_COLUMNS } from '../db/homeConnectionColumns';
import { NotFoundError } from '../errors';
import { config } from '../config';
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

/**
 * `device_claims.pending_secret` is the one column in this database that
 * ever holds a tunnel secret in plaintext (see `completeDeviceClaim`'s doc
 * comment for why it can't avoid that the way `completePairing` does) — this
 * key encrypts it at rest, so a raw DB read/backup during that brief window
 * alone isn't enough to recover it; the app's own runtime config is a
 * separate credential an attacker would also need. Read lazily, not at
 * `config` import time, so an environment that never exercises the device
 * claim flow (every test file that doesn't touch it, a future service split)
 * doesn't need this set — but the moment `completeDeviceClaim` or
 * `getDeviceClaimStatus` actually runs without it configured, this throws
 * loudly rather than silently storing/returning an unencrypted secret.
 */
function getClaimEncryptionKey(): Buffer {
  if (!config.tunnelClaimEncryptionKey) {
    throw new Error('TUNNEL_CLAIM_ENCRYPTION_KEY is not set — required to issue or complete a device claim. Generate one with `openssl rand -hex 32`.');
  }
  return Buffer.from(config.tunnelClaimEncryptionKey, 'hex');
}

/** AES-256-GCM: a fresh random IV per call (never reused with the same key), the auth tag appended so tampering is detected on decrypt, everything packed into one `base64url` string so the column stays a plain `text`. */
function encryptPendingSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getClaimEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64url');
}

function decryptPendingSecret(encoded: string): string {
  const raw = Buffer.from(encoded, 'base64url');
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', getClaimEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
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

export interface IssuedDeviceClaim {
  claimCode: string;
  /** Returned ONCE. Hashed at rest (`claimTokenHash`), exactly like a tunnel secret — see `hashSecret`. */
  claimToken: string;
  expiresAt: Date;
}

/**
 * Public, DEVICE-initiated counterpart to `issuePairingCode`: no caller
 * identity to check, because no Home is known yet — the device is asking to
 * be claimed by whichever owner scans/types its code next. See
 * `routes/tunnel.routes.ts`'s `POST /tunnel/claim`, and `schema.ts`'s
 * `deviceClaims` doc comment for the row's full lifecycle.
 */
export async function issueDeviceClaim(): Promise<IssuedDeviceClaim> {
  const claimCode = generatePairingCode();
  const claimToken = generateTunnelSecret();
  const expiresAt = new Date(Date.now() + PAIRING_CODE_TTL_MS);

  await getDb()
    .insert(deviceClaims)
    .values({ claimCode, claimTokenHash: hashSecret(claimToken), expiresAt });

  return { claimCode, claimToken, expiresAt };
}

export type DeviceClaimStatus =
  | { status: 'pending' }
  | {
      status: 'claimed';
      homeId: string;
      /**
       * Present only on the FIRST `claimed` read after `completeDeviceClaim`
       * — mirrors `completePairing`'s "the secret is returned exactly once"
       * contract, stretched across two separate requests instead of one (the
       * app's claim call and the device's later poll can't share a
       * response). `null` here means exactly one thing: an earlier poll
       * already collected it, not that claiming failed.
       */
      secret: string | null;
    }
  | { status: 'expired' };

/**
 * Called by the device itself, authenticated by the claim token alone (there
 * is no Oxy session on this side, same reasoning as `completePairing`) — see
 * `routes/tunnel.routes.ts`'s `GET /tunnel/claim/status`.
 */
export async function getDeviceClaimStatus(claimToken: string): Promise<DeviceClaimStatus> {
  const [row] = await getDb()
    .select({
      id: deviceClaims.id,
      status: deviceClaims.status,
      homeId: deviceClaims.homeId,
      pendingSecret: deviceClaims.pendingSecret,
      expiresAt: deviceClaims.expiresAt,
    })
    .from(deviceClaims)
    .where(eq(deviceClaims.claimTokenHash, hashSecret(claimToken)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('This device claim is invalid.');
  }

  if (row.status === 'pending' && row.expiresAt.getTime() < Date.now()) {
    await getDb().update(deviceClaims).set({ status: 'expired' }).where(eq(deviceClaims.id, row.id));
    return { status: 'expired' };
  }

  if (row.status === 'expired') {
    return { status: 'expired' };
  }

  if (row.status === 'claimed') {
    if (!row.homeId) throw new Error('A claimed device_claims row has no homeId — completeDeviceClaim should always set both together.');

    if (row.pendingSecret) {
      // Single delivery: decrypt, hand the plaintext secret back exactly
      // once, then clear the (still-encrypted) column in the same call so
      // the next poll gets `secret: null`.
      const secret = decryptPendingSecret(row.pendingSecret);
      await getDb().update(deviceClaims).set({ pendingSecret: null }).where(eq(deviceClaims.id, row.id));
      return { status: 'claimed', homeId: row.homeId, secret };
    }
    return { status: 'claimed', homeId: row.homeId, secret: null };
  }

  return { status: 'pending' };
}

/**
 * Owner-only. Attaches a Home to a claim a device already created
 * (`issueDeviceClaim`), generating a fresh tunnel secret for that Home the
 * same way `completePairing` does. Unlike `completePairing`, the secret is
 * not returned here — it is stashed, ENCRYPTED (`encryptPendingSecret`), in
 * `pendingSecret` for the device's own next `getDeviceClaimStatus` poll to
 * collect, since the caller of THIS function is the Oxy app, not the device.
 */
export async function completeDeviceClaim(claimCode: string, homeId: string, userId: string): Promise<void> {
  await assertActiveOwner(homeId, userId);

  const normalized = claimCode.trim().toUpperCase();
  const [row] = await getDb()
    .select({ id: deviceClaims.id, status: deviceClaims.status, expiresAt: deviceClaims.expiresAt })
    .from(deviceClaims)
    .where(eq(deviceClaims.claimCode, normalized))
    .limit(1);

  if (!row || row.status !== 'pending' || row.expiresAt.getTime() < Date.now()) {
    throw new NotFoundError('This claim code is invalid or has expired.');
  }

  const secret = generateTunnelSecret();
  const secretHash = hashSecret(secret);
  const claimedAt = new Date();

  await getDb().transaction(async (tx) => {
    await tx
      .insert(homeConnections)
      .values({ homeId, provider: 'home_assistant', tunnelSecretHash: secretHash })
      .onConflictDoUpdate({
        target: [homeConnections.homeId],
        set: { tunnelSecretHash: secretHash, pairingCode: null, pairingCodeExpiresAt: null },
      });

    await tx
      .update(deviceClaims)
      .set({ status: 'claimed', homeId, pendingSecret: encryptPendingSecret(secret), claimedAt })
      .where(eq(deviceClaims.id, row.id));
  });
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
