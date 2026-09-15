/**
 * Willo backend — Postgres schema.
 *
 * Six tables. This is a brand-new, small service: it does not
 * replicate OxyHQ/oxy's heavyweight schema-migration apparatus (no
 * deferred-foreign-key ledger — there is nothing here to defer — and no
 * generic table-scanning invariant-test suite). What IS kept, because it is
 * good practice regardless of scale: `generatedId()`/`createdAt()`/
 * `updatedAt()` from `@oxy.so/db`, snake_case columns (via `DATABASE_CASING`,
 * see `drizzle.config.ts` and `db/postgres.ts`), `text` + CHECK for every
 * closed vocabulary (never a pg `enum`), and a real foreign key with an
 * explicit `ON DELETE` for every relation that has a local row to reference.
 */

import { sql } from 'drizzle-orm';
import { boolean, check, index, jsonb, pgTable, text, unique } from 'drizzle-orm/pg-core';
import { createdAt, generatedId, inList, timestamptz, updatedAt } from '@oxy.so/db';

/**
 * `homes` — the smart-home space Willo controls. Deliberately a DIFFERENT
 * concept from an Oxy "Family" (a separate, general account-grouping
 * primitive): a household's Home members are not the same set as anyone's
 * Family.
 *
 * No owner column: ownership is a `home_members.role` fact, the same
 * reasoning OxyHQ/oxy's `families` table applies to its own group row for the
 * same reason (no `is_owner` flag on the group itself — see `home_members`
 * below for why more than one member may hold `role = 'owner'` at once).
 *
 * `name` is nullable: a nameless home (someone who never bothered to name
 * their own place) is a completely ordinary row, not a data-quality problem.
 */
export const homes = pgTable('homes', {
  id: generatedId(),
  name: text(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/**
 * `owner` may manage the Home Assistant connection and membership; `member`
 * may use and relabel devices but not touch either. No finer-grained
 * permission grants — out of scope, same reasoning as the sibling Family
 * feature.
 */
export const HOME_MEMBER_ROLES = ['owner', 'member'] as const;

/**
 * Membership lifecycle — invite/accept, never a silent add. `removed` is
 * retained rather than deleted (exactly like `account_members.status`) so a
 * later re-invitation reactivates the same row instead of fighting the unique
 * constraint below with a duplicate.
 */
export const HOME_MEMBER_STATUSES = ['invited', 'active', 'removed'] as const;

/**
 * `home_members` — who has access to control a Home, and at what role.
 *
 * `memberUserId` and `invitedByUserId` are opaque Oxy account ids: per this
 * session's established Oxy convention (confirmed against OxyHQ/Mention's own
 * schema — e.g. `account_members.member_user_id`), a member row never stores
 * a local shadow copy of profile data. There is also no local `users` table
 * in this service at all to reference, so unlike `account_members` these
 * columns carry no foreign key — a cross-service id, not a local one.
 *
 * DELIBERATELY allows more than one ACTIVE `owner` per Home: a shared home
 * where either partner should be able to manage the HA connection is a real
 * case, and nothing here forces a single organizer. See
 * `homeMembers.service.ts`'s `leaveHome` for the one place that reasons about
 * "is this the last active owner".
 *
 * DELIBERATELY allows a person to belong to more than one Home at once (their
 * own place, a shared house, a parent's house) — there is NO one-home-at-a-time
 * constraint. That constraint was a real mistake made and reverted on the
 * sibling Family feature this session; `(homeId, memberUserId)` is the only
 * uniqueness this table enforces.
 */
export const homeMembers = pgTable(
  'home_members',
  {
    id: generatedId(),
    homeId: text()
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    memberUserId: text().notNull(),
    role: text({ enum: HOME_MEMBER_ROLES }).notNull(),
    status: text({ enum: HOME_MEMBER_STATUSES }).notNull().default('invited'),
    /** Who issued the invitation. Opaque Oxy id, no FK — same reasoning as `memberUserId`. */
    invitedByUserId: text(),
    /** Set when `status` moves to `active`. Null for a still-pending invite or a self-created owner row before the transaction commits it. */
    joinedAt: timestamptz(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('home_members_home_id_member_user_id_key').on(t.homeId, t.memberUserId),
    // "What can this user reach" — drives GET /homes/me.
    index('home_members_member_user_id_status_idx').on(t.memberUserId, t.status),
    check('home_members_role_check', sql`${t.role} in (${sql.raw(inList(HOME_MEMBER_ROLES))})`),
    check('home_members_status_check', sql`${t.status} in (${sql.raw(inList(HOME_MEMBER_STATUSES))})`),
  ]
);

/**
 * `home_device_metadata` — Willo's own per-device overlay: a custom name,
 * room, and favourite flag per (home, HA entity id). Home Assistant's own
 * naming/rooms stay untouched, and live device STATE (on/off, brightness,
 * sensor readings) never lands here — that stays a direct client→HA
 * connection for latency reasons, unchanged by this backend.
 *
 * `entityId` is opaque (HA's own id, e.g. `light.kitchen`) with no FK: Home
 * Assistant is the source of truth for whether the entity still exists, and
 * this row is allowed to outlive a device that was later removed from HA.
 */
export const homeDeviceMetadata = pgTable(
  'home_device_metadata',
  {
    id: generatedId(),
    homeId: text()
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    entityId: text().notNull(),
    customName: text(),
    room: text(),
    isFavorite: boolean().notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [unique('home_device_metadata_home_id_entity_id_key').on(t.homeId, t.entityId)]
);

/**
 * The only provider today. `text` + CHECK rather than a second table: adding
 * a second smart-home provider later is a CHECK-widening migration, matching
 * the `SmartHomeProvider` abstraction already in the frontend
 * (`packages/frontend/providers/home-assistant.ts` is its first and, so far,
 * only implementation).
 */
export const HOME_CONNECTION_PROVIDERS = ['home_assistant'] as const;

/**
 * `home_connections` — the Home Assistant TUNNEL for a Home: a Home
 * Assistant custom integration holds a persistent outbound Socket.IO
 * connection to this backend (`realtime/tunnelNamespace.ts`), so the browser
 * never talks to Home Assistant directly (that was the old design — a direct
 * browser→HA OAuth + WebSocket connection — and it is unfixably broken by
 * browser Mixed-Content policy the moment HA isn't on HTTPS, which is the
 * common case). One row per Home (`homeId` is UNIQUE), covering its whole
 * lifecycle:
 *
 *   1. UNPAIRED: `pairingCode`/`pairingCodeExpiresAt` set, `tunnelSecretHash`
 *      null. Created by `POST /homes/:id/pairing-code` (owner only).
 *   2. PAIRED, never connected: the HA integration exchanged the code for a
 *      secret (`POST /tunnel/pair` — no Oxy auth, the code IS the auth).
 *      `tunnelSecretHash` set, pairing fields cleared (single-use).
 *   3. CONNECTED at least once: `connectedAt`/`lastSeenAt`/`deviceSnapshot`
 *      populated by `realtime/tunnelNamespace.ts` as the integration reports
 *      state. `lastSeenAt` also tracks the most recent disconnect, so
 *      "currently online" is `lastSeenAt` within a short grace window, not a
 *      separate boolean this row would have to keep in sync on a crash.
 *
 * `tunnelSecretHash` IS THE SENSITIVE COLUMN — a SHA-256 digest, never the
 * raw secret (which is shown to the integration exactly once, at pairing,
 * and never stored). See `db/homeConnectionColumns.ts` for the narrow
 * selector every read path other than `services/homeTunnel.service.ts`'s
 * `authenticateTunnel` must use.
 */
export const homeConnections = pgTable(
  'home_connections',
  {
    id: generatedId(),
    homeId: text()
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    provider: text({ enum: HOME_CONNECTION_PROVIDERS }).notNull(),
    pairingCode: text(),
    pairingCodeExpiresAt: timestamptz(),
    tunnelSecretHash: text(),
    connectedAt: timestamptz(),
    lastSeenAt: timestamptz(),
    /** The last full device list the integration reported (`state_snapshot`/`state_changed`), served back to the browser by `GET /homes/:id/devices/live` without waiting on a live round trip to the home. */
    deviceSnapshot: jsonb(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique('home_connections_home_id_key').on(t.homeId),
    check(
      'home_connections_provider_check',
      sql`${t.provider} in (${sql.raw(inList(HOME_CONNECTION_PROVIDERS))})`
    ),
  ]
);

/**
 * Willo's own semantic categories for a `home_events` row — NOT Home
 * Assistant's `device_class` verbatim (that's kept alongside, in
 * `deviceClass`, for anything finer-grained a screen wants). `motion`/
 * `contact`/`safety` are derived today from a binary_sensor's `device_class`
 * (see `homeEvents.service.ts`'s `categorizeDeviceClass`); `other` covers a
 * `device_class` that mapping doesn't recognize. `text` + CHECK, matching
 * this file's own convention, is deliberate here for another reason too:
 * this vocabulary is meant to grow — a future AI-driven detection event
 * (`person`, `animal`, `package`, off a camera feed rather than a sensor)
 * is a CHECK-widening migration, not a new table or column, when that
 * pipeline gets built. Nothing that pipeline needs exists yet.
 */
export const HOME_EVENT_TYPES = ['motion', 'contact', 'safety', 'other'] as const;

/**
 * `home_events` — a Home's real activity history (`/activity`'s data
 * source), one row per state TRANSITION. Deliberately narrower than every
 * device state change the tunnel reports: only entities with a
 * `binarySensor` capability produce a row here (`realtime/tunnelNamespace.ts`'s
 * `state_changed` handler is the one caller). A light dimming is routine
 * device control, not "activity" — matching what Apple/Google Home's own
 * activity feeds actually show. Never written from the initial
 * `state_snapshot` a reconnect sends: that would log a spurious "event" for
 * every sensor's current, unchanged state on every reconnect. Home
 * Assistant's own `EVENT_STATE_CHANGED` fires only on a genuine transition,
 * so no additional de-duplication is needed here.
 *
 * `entityId`/`deviceClass` are opaque, no FK — same reasoning as
 * `home_device_metadata.entityId`: this row must outlive a since-removed
 * sensor.
 *
 * `active` is nullable: every event today is a real on/off transition, but a
 * future detection-style event (no natural on/off pairing) can leave it
 * null instead of being forced to fake one.
 */
export const homeEvents = pgTable(
  'home_events',
  {
    id: generatedId(),
    homeId: text()
      .notNull()
      .references(() => homes.id, { onDelete: 'cascade' }),
    entityId: text().notNull(),
    name: text().notNull(),
    room: text(),
    eventType: text({ enum: HOME_EVENT_TYPES }).notNull(),
    deviceClass: text(),
    active: boolean(),
    occurredAt: timestamptz().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    // "This Home's most recent activity first" — the only query `/activity` makes.
    index('home_events_home_id_occurred_at_idx').on(t.homeId, t.occurredAt),
    check('home_events_event_type_check', sql`${t.eventType} in (${sql.raw(inList(HOME_EVENT_TYPES))})`),
  ]
);

/**
 * Lifecycle for a `device_claims` row — see the table's own doc comment for
 * the full flow. `expired` is written by `homeTunnel.service.ts`'s
 * `getDeviceClaimStatus` the first time a still-`pending` row is read past
 * its `expiresAt`; nothing sweeps these rows proactively.
 */
export const DEVICE_CLAIM_STATUSES = ['pending', 'claimed', 'expired'] as const;

/**
 * `device_claims` — the DEVICE-initiated counterpart to `home_connections`'s
 * pairing fields (`pairingCode`/`pairingCodeExpiresAt`): there the app knows
 * the Home first and hands the device a code; here the device knows nothing
 * about any Home yet and asks for a claim on its own, so this row starts
 * independent of any `homeId` and only gains one once an owner claims it.
 * See `homeTunnel.service.ts`'s `issueDeviceClaim`/`getDeviceClaimStatus`/
 * `completeDeviceClaim` for the three functions that drive it, and
 * `routes/tunnel.routes.ts` / `routes/homes.routes.ts` for the routes.
 *
 *   1. PENDING: `issueDeviceClaim` (public, no Oxy auth) inserts this row —
 *      `claimCode` (shown to a person, e.g. via QR) and `claimTokenHash` (the
 *      device's own bearer credential for polling its status) are both set,
 *      `homeId`/`pendingSecret`/`claimedAt` are null.
 *   2. CLAIMED: `completeDeviceClaim` (owner only, authenticated Oxy call)
 *      looks the row up by `claimCode`, generates a NEW tunnel secret,
 *      upserts it into `home_connections` for the given Home, and sets
 *      `status = 'claimed'`, `homeId`, `pendingSecret` (the plaintext secret,
 *      briefly held here — see that function's own doc comment for the
 *      security tradeoff this implies), `claimedAt`.
 *   3. DELIVERED: the device's own poll (`getDeviceClaimStatus`, authenticated
 *      by `claimTokenHash` alone) reads `pendingSecret` and clears it in the
 *      same call — single delivery, mirroring `completePairing`'s "the
 *      secret is returned exactly once" contract. `status` stays `claimed`
 *      forever after; only `pendingSecret` moves from set to null.
 *   4. EXPIRED: a row that reached `expiresAt` while still `pending` — see
 *      `DEVICE_CLAIM_STATUSES`'s doc comment.
 *
 * `claimTokenHash` IS THE SENSITIVE COLUMN, exactly like `home_connections.
 * tunnelSecretHash` — a SHA-256 digest, never the raw token, which is
 * returned to the device once, at `issueDeviceClaim`.
 */
export const deviceClaims = pgTable(
  'device_claims',
  {
    id: generatedId(),
    claimCode: text().notNull(),
    claimTokenHash: text().notNull(),
    status: text({ enum: DEVICE_CLAIM_STATUSES }).notNull().default('pending'),
    homeId: text().references(() => homes.id, { onDelete: 'cascade' }),
    /** Plaintext tunnel secret, set by `completeDeviceClaim`, cleared by the device's own next `getDeviceClaimStatus` poll — see the table's doc comment, step 3. */
    pendingSecret: text(),
    createdAt: createdAt(),
    expiresAt: timestamptz().notNull(),
    claimedAt: timestamptz(),
  },
  (t) => [
    unique('device_claims_claim_code_key').on(t.claimCode),
    check('device_claims_status_check', sql`${t.status} in (${sql.raw(inList(DEVICE_CLAIM_STATUSES))})`),
  ]
);
