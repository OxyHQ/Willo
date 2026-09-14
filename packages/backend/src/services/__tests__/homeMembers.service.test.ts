/**
 * Runs against a REAL Postgres — set DATABASE_URL (see `.env.example`) before
 * running `bun test src`. `bun run db:up` starts one locally.
 */

import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { closePostgres, connectPostgres, getDb } from '../../db/postgres';
import { homeMembers, homes } from '../../db/schema';
import { createHome, getMembership } from '../homes.service';
import { acceptInvite, declineInvite, inviteMember, leaveHome, removeMember } from '../homeMembers.service';
import { ForbiddenError, NotFoundError } from '../../errors';

before(async () => {
  await connectPostgres();
});

after(async () => {
  await closePostgres();
});

async function deleteHomeIfExists(homeId: string): Promise<void> {
  await getDb().delete(homes).where(eq(homes.id, homeId));
}

function newUserId(label: string): string {
  return `user-${label}-${crypto.randomUUID()}`;
}

test('invite -> accept makes the invitee an active member', async () => {
  const owner = newUserId('owner');
  const invitee = newUserId('invitee');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, invitee);
    assert.equal(invite.status, 'invited');
    assert.equal(invite.role, 'member');
    assert.equal(invite.invitedByUserId, owner);

    const accepted = await acceptInvite(home.id, invite.id, invitee);
    assert.equal(accepted.status, 'active');
    assert.ok(accepted.joinedAt);
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('invite -> decline leaves the invitee out, and re-inviting reactivates the same row', async () => {
  const owner = newUserId('owner');
  const invitee = newUserId('invitee');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, invitee);
    const declined = await declineInvite(home.id, invite.id, invitee);
    assert.equal(declined.status, 'removed');

    const reinvited = await inviteMember(home.id, owner, invitee);
    assert.equal(reinvited.id, invite.id, 'reactivates the same row rather than inserting a duplicate');
    assert.equal(reinvited.status, 'invited');
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('only an active owner may invite', async () => {
  const owner = newUserId('owner');
  const member = newUserId('member');
  const outsider = newUserId('outsider');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, member);
    await acceptInvite(home.id, invite.id, member);

    await assert.rejects(() => inviteMember(home.id, member, outsider), ForbiddenError);
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('an owner may remove a member, but never via removeMember on themselves', async () => {
  const owner = newUserId('owner');
  const member = newUserId('member');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, member);
    await acceptInvite(home.id, invite.id, member);

    const ownerMembership = await getMembership(home.id, owner);
    assert.ok(ownerMembership);
    await assert.rejects(() => removeMember(home.id, owner, ownerMembership.id));

    const removed = await removeMember(home.id, owner, invite.id);
    assert.equal(removed.status, 'removed');
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('a member may leave freely', async () => {
  const owner = newUserId('owner');
  const member = newUserId('member');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, member);
    await acceptInvite(home.id, invite.id, member);

    const result = await leaveHome(home.id, member);
    assert.equal(result.dissolved, false);
    const membership = await getMembership(home.id, member);
    assert.equal(membership?.status, 'removed');
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('an owner may leave when another active owner remains', async () => {
  const ownerOne = newUserId('owner-one');
  const ownerTwo = newUserId('owner-two');
  const { home } = await createHome(ownerOne);
  try {
    // Promote ownerTwo to an active owner directly (no promote-to-owner
    // endpoint in this pass — inserted here to exercise the multi-owner rule).
    await getDb()
      .insert(homeMembers)
      .values({ homeId: home.id, memberUserId: ownerTwo, role: 'owner', status: 'active', joinedAt: new Date() });

    const result = await leaveHome(home.id, ownerOne);
    assert.equal(result.dissolved, false);
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('the sole owner may not leave while other active members remain', async () => {
  const owner = newUserId('owner');
  const member = newUserId('member');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, member);
    await acceptInvite(home.id, invite.id, member);

    await assert.rejects(() => leaveHome(home.id, owner), ForbiddenError);
  } finally {
    await deleteHomeIfExists(home.id);
  }
});

test('the sole owner, as the sole member, dissolves the Home by leaving', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);

  const result = await leaveHome(home.id, owner);
  assert.equal(result.dissolved, true);

  const [row] = await getDb().select().from(homes).where(eq(homes.id, home.id)).limit(1);
  assert.equal(row, undefined, 'the homes row itself is gone');
});

test('acceptInvite/declineInvite reject a caller who is not the invitee', async () => {
  const owner = newUserId('owner');
  const invitee = newUserId('invitee');
  const impostor = newUserId('impostor');
  const { home } = await createHome(owner);
  try {
    const invite = await inviteMember(home.id, owner, invitee);
    await assert.rejects(() => acceptInvite(home.id, invite.id, impostor), NotFoundError);
    await assert.rejects(() => declineInvite(home.id, invite.id, impostor), NotFoundError);
  } finally {
    await deleteHomeIfExists(home.id);
  }
});
