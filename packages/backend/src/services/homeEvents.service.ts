/**
 * A Home's real activity history — see `schema.ts`'s `homeEvents` doc
 * comment for what a row means and why only binary_sensor transitions
 * produce one.
 */

import { desc, eq } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeEvents, type HOME_EVENT_TYPES } from '../db/schema';
import { assertActiveMember } from './homes.service';

type HomeEventType = (typeof HOME_EVENT_TYPES)[number];

const MOTION_DEVICE_CLASSES = new Set(['motion', 'occupancy', 'presence', 'moving']);
const CONTACT_DEVICE_CLASSES = new Set(['door', 'garage_door', 'window', 'opening', 'lock']);
const SAFETY_DEVICE_CLASSES = new Set([
  'smoke',
  'gas',
  'moisture',
  'safety',
  'problem',
  'heat',
  'cold',
  'tamper',
  'sound',
  'vibration',
  'co',
  'battery',
]);

/** Home Assistant's `device_class` -> Willo's own, smaller activity category. See `schema.ts`'s `HOME_EVENT_TYPES` doc comment for why this vocabulary is deliberately open-ended. */
function categorizeDeviceClass(deviceClass: string | null): HomeEventType {
  if (deviceClass && MOTION_DEVICE_CLASSES.has(deviceClass)) return 'motion';
  if (deviceClass && CONTACT_DEVICE_CLASSES.has(deviceClass)) return 'contact';
  if (deviceClass && SAFETY_DEVICE_CLASSES.has(deviceClass)) return 'safety';
  return 'other';
}

export interface BinarySensorTransition {
  entityId: string;
  name: string;
  room: string | null;
  deviceClass: string | null;
  active: boolean;
}

/**
 * Called ONLY for a `state_changed` tunnel message whose device carries a
 * `binarySensor` capability — see `realtime/tunnelNamespace.ts`. Never called
 * for the initial `state_snapshot` a (re)connect sends: Home Assistant's own
 * `EVENT_STATE_CHANGED` fires only on a genuine transition, so every call
 * here is already a real event with no de-duplication needed — but the
 * snapshot reports every sensor's CURRENT state regardless of whether it
 * changed, and logging that too would fabricate a spurious event for every
 * sensor on every reconnect.
 */
export async function recordBinarySensorEvent(homeId: string, transition: BinarySensorTransition): Promise<void> {
  await getDb()
    .insert(homeEvents)
    .values({
      homeId,
      entityId: transition.entityId,
      name: transition.name,
      room: transition.room,
      eventType: categorizeDeviceClass(transition.deviceClass),
      deviceClass: transition.deviceClass,
      active: transition.active,
      occurredAt: new Date(),
    });
}

const EVENT_HISTORY_LIMIT = 200;

export interface HomeEventRow {
  id: string;
  entityId: string;
  name: string;
  room: string | null;
  eventType: HomeEventType;
  deviceClass: string | null;
  active: boolean | null;
  occurredAt: Date;
}

/** Any active member. Most recent first, capped at `EVENT_HISTORY_LIMIT` — this is an activity feed, not an audit export. */
export async function listEvents(homeId: string, userId: string): Promise<HomeEventRow[]> {
  await assertActiveMember(homeId, userId);
  return getDb()
    .select({
      id: homeEvents.id,
      entityId: homeEvents.entityId,
      name: homeEvents.name,
      room: homeEvents.room,
      eventType: homeEvents.eventType,
      deviceClass: homeEvents.deviceClass,
      active: homeEvents.active,
      occurredAt: homeEvents.occurredAt,
    })
    .from(homeEvents)
    .where(eq(homeEvents.homeId, homeId))
    .orderBy(desc(homeEvents.occurredAt))
    .limit(EVENT_HISTORY_LIMIT);
}
