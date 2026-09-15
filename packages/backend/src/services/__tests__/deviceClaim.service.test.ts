/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. `bun run db:up` starts one locally.
 *
 * Covers the DEVICE-initiated claim flow (`issueDeviceClaim` /
 * `getDeviceClaimStatus` / `completeDeviceClaim`), mirroring
 * `homeTunnel.service.test.ts`'s style for the existing APP-initiated
 * pairing flow.
 */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { deviceClaims, homes } from '../../db/schema';
import { createHome } from '../homes.service';
import { authenticateTunnel, completeDeviceClaim, getDeviceClaimStatus, issueDeviceClaim } from '../homeTunnel.service';
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

test('issuing a device claim, then completing it, delivers the tunnel secret to the device exactly once', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const { claimCode, claimToken, expiresAt } = await issueDeviceClaim();
    assert.equal(claimCode.length, 8);
    assert.ok(expiresAt.getTime() > Date.now());

    assert.deepEqual(await getDeviceClaimStatus(claimToken), { status: 'pending' });

    await completeDeviceClaim(claimCode, home.id, owner);

    const firstRead = await getDeviceClaimStatus(claimToken);
    assert.equal(firstRead.status, 'claimed');
    assert.ok(firstRead.status === 'claimed' && firstRead.homeId === home.id);
    assert.ok(firstRead.status === 'claimed' && typeof firstRead.secret === 'string' && firstRead.secret.length > 0);
    const secret = firstRead.status === 'claimed' ? firstRead.secret : null;
    assert.ok(secret);
    assert.equal(await authenticateTunnel(home.id, secret), true);

    // Single delivery: a second poll sees the claim is still `claimed`, but
    // the secret itself is gone — some earlier poll already collected it.
    const secondRead = await getDeviceClaimStatus(claimToken);
    assert.deepEqual(secondRead, { status: 'claimed', homeId: home.id, secret: null });
  } finally {
    // `completeDeviceClaim` set `homeId` on the claim row, so deleting the
    // Home cascades to it too.
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('the tunnel secret is encrypted at rest between completion and the device collecting it', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const { claimCode, claimToken } = await issueDeviceClaim();
    await completeDeviceClaim(claimCode, home.id, owner);

    const [row] = await getDb().select({ pendingSecret: deviceClaims.pendingSecret }).from(deviceClaims).where(eq(deviceClaims.claimCode, claimCode)).limit(1);
    assert.ok(row?.pendingSecret, 'expected a pending secret to be stored after completion');
    // The stored value must not be (or contain) the plaintext secret this
    // poll is about to return — if it did, encryption isn't actually
    // happening and a raw DB read would recover the real tunnel secret.
    const { secret } = await getDeviceClaimStatus(claimToken) as { secret: string };
    assert.ok(secret);
    assert.notEqual(row.pendingSecret, secret);
    assert.ok(!row.pendingSecret.includes(secret));
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('a device claim reports pending until claimed, then expires on its own once past its TTL', async () => {
  const { claimCode, claimToken } = await issueDeviceClaim();
  try {
    assert.deepEqual(await getDeviceClaimStatus(claimToken), { status: 'pending' });

    // Force expiry without waiting out the real 15-minute TTL.
    await getDb()
      .update(deviceClaims)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(deviceClaims.claimCode, claimCode));

    assert.deepEqual(await getDeviceClaimStatus(claimToken), { status: 'expired' });
    // Stays expired on a later read too, not just the read that caught it.
    assert.deepEqual(await getDeviceClaimStatus(claimToken), { status: 'expired' });
  } finally {
    await getDb().delete(deviceClaims).where(eq(deviceClaims.claimCode, claimCode));
  }
});

test('getDeviceClaimStatus rejects an unknown claim token', async () => {
  await assert.rejects(() => getDeviceClaimStatus('not-a-real-token'), NotFoundError);
});

test('a device claim cannot be completed twice', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    const { claimCode } = await issueDeviceClaim();
    await completeDeviceClaim(claimCode, home.id, owner);
    await assert.rejects(() => completeDeviceClaim(claimCode, home.id, owner), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});

test('only an active owner may complete a device claim', async () => {
  const owner = newUserId('owner');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  let claimCode = '';
  try {
    claimCode = (await issueDeviceClaim()).claimCode;
    await assert.rejects(() => completeDeviceClaim(claimCode, home.id, outsider), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
    // Rejected before `homeId` was ever set on the claim row, so it did not
    // cascade-delete with the Home above — clean it up explicitly.
    await getDb().delete(deviceClaims).where(eq(deviceClaims.claimCode, claimCode));
  }
});

test('completeDeviceClaim rejects an unknown claim code', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  try {
    await assert.rejects(() => completeDeviceClaim('NOSUCHCLAIM', home.id, owner), NotFoundError);
  } finally {
    await getDb().delete(homes).where(eq(homes.id, home.id));
  }
});
