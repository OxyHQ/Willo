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
import { listDeviceMetadata, upsertDeviceMetadata } from '../homeDevices.service';
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

test('upsertDeviceMetadata creates, then replaces, one entity’s overlay', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const created = await upsertDeviceMetadata(home.id, owner, 'light.kitchen', {
      customName: 'Kitchen ceiling',
      room: 'Kitchen',
      isFavorite: true,
    });
    assert.equal(created.customName, 'Kitchen ceiling');
    assert.equal(created.room, 'Kitchen');
    assert.equal(created.isFavorite, true);

    // PUT semantics: an omitted field resets rather than being left alone.
    const replaced = await upsertDeviceMetadata(home.id, owner, 'light.kitchen', { customName: 'Ceiling light' });
    assert.equal(replaced.id, created.id, 'same (home, entity) row is updated, not duplicated');
    assert.equal(replaced.customName, 'Ceiling light');
    assert.equal(replaced.room, null);
    assert.equal(replaced.isFavorite, false);

    const listed = await listDeviceMetadata(home.id, owner);
    assert.equal(listed.length, 1);
    assert.equal(listed[0]?.entityId, 'light.kitchen');
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a non-member cannot read or write a Home’s device metadata', async () => {
  const owner = newUserId('owner');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  try {
    await assert.rejects(() => listDeviceMetadata(home.id, outsider), NotFoundError);
    await assert.rejects(() => upsertDeviceMetadata(home.id, outsider, 'light.kitchen', {}), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});
