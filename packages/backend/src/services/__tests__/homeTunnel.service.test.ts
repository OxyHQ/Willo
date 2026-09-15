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
import {
  applyDeviceUpdate,
  authenticateTunnel,
  completePairing,
  getLiveDevices,
  issuePairingCode,
} from '../homeTunnel.service';
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

test('pairing issues a code, and completing it yields a secret authenticateTunnel accepts', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const { code, expiresAt } = await issuePairingCode(home.id, owner);
    assert.equal(code.length, 8);
    assert.ok(expiresAt.getTime() > Date.now());

    const pairing = await completePairing(code);
    assert.equal(pairing.homeId, home.id);
    assert.ok(pairing.secret.length > 0);

    assert.equal(await authenticateTunnel(home.id, pairing.secret), true);
    assert.equal(await authenticateTunnel(home.id, 'wrong-secret'), false);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a pairing code is single-use', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const { code } = await issuePairingCode(home.id, owner);
    await completePairing(code);
    await assert.rejects(() => completePairing(code), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('completePairing rejects an unknown code', async () => {
  await assert.rejects(() => completePairing('NOSUCHCODE'), NotFoundError);
});

test('issuing a new pairing code invalidates the previous tunnel secret', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const first = await completePairing((await issuePairingCode(home.id, owner)).code);
    assert.equal(await authenticateTunnel(home.id, first.secret), true);

    // Re-pairing (a factory reset, a replaced device) issues a NEW code —
    // the old secret must stop working immediately, not linger.
    const second = await completePairing((await issuePairingCode(home.id, owner)).code);
    assert.equal(await authenticateTunnel(home.id, first.secret), false);
    assert.equal(await authenticateTunnel(home.id, second.secret), true);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('only an owner may issue a pairing code', async () => {
  const owner = newUserId('owner');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  try {
    await assert.rejects(() => issuePairingCode(home.id, outsider), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('applyDeviceUpdate creates, then replaces, one device in the cached snapshot', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await applyDeviceUpdate(home.id, { id: 'light.kitchen', on: true });
    await applyDeviceUpdate(home.id, { id: 'light.hallway', on: false });
    const afterCreate = await applyDeviceUpdate(home.id, { id: 'light.kitchen', on: false });
    assert.equal(afterCreate.length, 2, 'the existing entity is replaced, not duplicated');

    const { devices } = await getLiveDevices(home.id, owner);
    const kitchen = (devices as Array<{ id: string; on: boolean }>).find((device) => device.id === 'light.kitchen');
    assert.equal(kitchen?.on, false);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a non-member cannot read a Home’s live devices', async () => {
  const owner = newUserId('owner');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  try {
    await assert.rejects(() => getLiveDevices(home.id, outsider), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});
