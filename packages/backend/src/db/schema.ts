/**
 * Willo backend — Postgres schema.
 *
 * Four tables, one migration. This is a brand-new, small service: it does not
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
