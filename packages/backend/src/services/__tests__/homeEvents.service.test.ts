/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. `bun run db:up` starts one locally.
 */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { homes } from '../../db/schema';
import { createHome } from '../homes.service';
import { listEvents, recordBinarySensorEvent, type BinarySensorTransition } from '../homeEvents.service';
import { NotFoundError } from '../../errors';

before(async () => {
  await connectPostgres();
});

after(async () => {
  await closePostgres();
});

function newUserId(label: string): string {
  return `user-${label}-${crypto.randomUUID()}`;
}

function transition(overrides: Partial<BinarySensorTransition> = {}): BinarySensorTransition {
  return {
    entityId: 'binary_sensor.front_door',
    name: 'Front Door',
    room: 'Entryway',
    deviceClass: 'door',
    active: true,
    ...overrides,
  };
}

test('a door/window transition is categorized as contact', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition({ deviceClass: 'window' }));
    const [event] = await listEvents(home.id, owner);
    assert.equal(event?.eventType, 'contact');
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a motion/occupancy transition is categorized as motion', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.hallway_motion', deviceClass: 'occupancy' }));
    const [event] = await listEvents(home.id, owner);
    assert.equal(event?.eventType, 'motion');
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a smoke/gas transition is categorized as safety', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.kitchen_smoke', deviceClass: 'smoke' }));
    const [event] = await listEvents(home.id, owner);
    assert.equal(event?.eventType, 'safety');
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('an unrecognized or missing device_class falls back to other', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.unknown', deviceClass: null }));
    const [event] = await listEvents(home.id, owner);
    assert.equal(event?.eventType, 'other');
    assert.equal(event?.deviceClass, null);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('listEvents returns this Home’s events most-recent-first', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.a', active: true }));
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.b', active: false }));
    await recordBinarySensorEvent(home.id, transition({ entityId: 'binary_sensor.c', active: true }));

    const events = await listEvents(home.id, owner);
    assert.equal(events.length, 3);
    assert.deepEqual(
      events.map(event => event.entityId),
      ['binary_sensor.c', 'binary_sensor.b', 'binary_sensor.a']
    );
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a non-member cannot read a Home’s activity history', async () => {
  const owner = newUserId('owner');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  try {
    await recordBinarySensorEvent(home.id, transition());
    await assert.rejects(() => listEvents(home.id, outsider), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('events from one Home never leak into another Home’s activity history', async () => {
  const owner = newUserId('owner');
  const { home: homeA } = await createHome(owner);
  const { home: homeB } = await createHome(owner);
  try {
    await recordBinarySensorEvent(homeA.id, transition({ entityId: 'binary_sensor.a' }));
    await recordBinarySensorEvent(homeB.id, transition({ entityId: 'binary_sensor.b' }));

    const eventsA = await listEvents(homeA.id, owner);
    const eventsB = await listEvents(homeB.id, owner);
    assert.deepEqual(eventsA.map(event => event.entityId), ['binary_sensor.a']);
    assert.deepEqual(eventsB.map(event => event.entityId), ['binary_sensor.b']);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, homeA.id));
    await getDb().delete(homes).where(eq(homes.id, homeB.id));
  }
});
