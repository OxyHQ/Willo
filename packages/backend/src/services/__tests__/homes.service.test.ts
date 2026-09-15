/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. `bun run db:up` starts one locally.
 */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { homes } from '../../db/schema';
import { NotFoundError } from '../../errors';
import { createHome, listHomesForUser, updateHomeSettings } from '../homes.service';

before(async () => {
  await connectPostgres();
});

after(async () => {
  await closePostgres();
});

async function deleteHome(homeId: string): Promise<void> {
  // ON DELETE CASCADE on home_members/home_device_metadata/home_connections
  // takes care of every dependent row.
  await getDb().delete(homes).where(eq(homes.id, homeId));
}

test('createHome makes the caller an active owner', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const { home, myRole, members } = await createHome(userId, 'Test House');
  try {
    assert.equal(home.name, 'Test House');
    assert.equal(myRole, 'owner');
    assert.equal(members.length, 1);
    assert.equal(members[0]?.memberUserId, userId);
    assert.equal(members[0]?.status, 'active');
  } finally {
    await deleteHome(home.id);
  }
});

test('createHome allows a nameless Home', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const { home } = await createHome(userId);
  try {
    assert.equal(home.name, null);
  } finally {
    await deleteHome(home.id);
  }
});

test('a person can belong to more than one Home at once (no one-home-at-a-time constraint)', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const first = await createHome(userId, 'Home One');
  const second = await createHome(userId, 'Home Two');
  try {
    const myHomes = await listHomesForUser(userId);
    const ids = myHomes.map((entry) => entry.home.id).sort();
    assert.deepEqual(ids, [first.home.id, second.home.id].sort());
    for (const entry of myHomes) {
      assert.equal(entry.myRole, 'owner');
    }
  } finally {
    await deleteHome(first.home.id);
    await deleteHome(second.home.id);
  }
});

test('listHomesForUser omits Homes the caller does not actively belong to', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const otherUserId = `user-${crypto.randomUUID()}`;
  const { home } = await createHome(otherUserId, 'Someone Else’s House');
  try {
    const myHomes = await listHomesForUser(userId);
    assert.equal(myHomes.some((entry) => entry.home.id === home.id), false);
  } finally {
    await deleteHome(home.id);
  }
});

test('createHome stores the unit system the creating device chose, and defaults to metric without one', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const { home: imperial } = await createHome(userId, 'US House', 'imperial');
  const { home: unspecified } = await createHome(userId);
  try {
    assert.equal(imperial.unitSystem, 'imperial');
    assert.equal(unspecified.unitSystem, 'metric');
  } finally {
    await deleteHome(imperial.id);
    await deleteHome(unspecified.id);
  }
});

test('updateHomeSettings lets an active member change the Home’s unit system', async () => {
  const userId = `user-${crypto.randomUUID()}`;
  const { home } = await createHome(userId, 'Test House', 'metric');
  try {
    const updated = await updateHomeSettings(home.id, userId, { unitSystem: 'imperial' });
    assert.equal(updated.unitSystem, 'imperial');
    const [stored] = await getDb().select().from(homes).where(eq(homes.id, home.id));
    assert.equal(stored?.unitSystem, 'imperial');
  } finally {
    await deleteHome(home.id);
  }
});

test('updateHomeSettings refuses someone who is not a member, leaving the Home unchanged', async () => {
  const ownerId = `user-${crypto.randomUUID()}`;
  const strangerId = `user-${crypto.randomUUID()}`;
  const { home } = await createHome(ownerId, 'Test House', 'metric');
  try {
    await assert.rejects(updateHomeSettings(home.id, strangerId, { unitSystem: 'imperial' }), NotFoundError);
    const [stored] = await getDb().select().from(homes).where(eq(homes.id, home.id));
    assert.equal(stored?.unitSystem, 'metric');
  } finally {
    await deleteHome(home.id);
  }
});
