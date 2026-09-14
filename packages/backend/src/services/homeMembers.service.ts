import { and, eq } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeMembers, homes } from '../db/schema';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../errors';
import { emitToHome } from '../realtime/socketRegistry';
import {
  assertActiveMember,
  assertActiveOwner,
  countOtherActiveMembers,
  countOtherActiveOwners,
  getMembership,
  type HomeMemberRow,
} from './homes.service';

function emitMembershipChanged(homeId: string): void {
  emitToHome(homeId, 'home:membership-changed', { homeId });
}

/** Invite a member by Oxy user id (owner only). Reactivates a previously-removed row rather than erroring on the unique (homeId, memberUserId) pair. */
export async function inviteMember(homeId: string, inviterUserId: string, targetUserId: string): Promise<HomeMemberRow> {
  await assertActiveOwner(homeId, inviterUserId);
  if (targetUserId === inviterUserId) {
    throw new BadRequestError('You are already a member of this Home.');
  }

  const db = getDb();
  const existing = await getMembership(homeId, targetUserId);

  let result: HomeMemberRow | undefined;
  if (!existing) {
    [result] = await db
      .insert(homeMembers)
      .values({ homeId, memberUserId: targetUserId, role: 'member', status: 'invited', invitedByUserId: inviterUserId })
      .returning();
  } else if (existing.status === 'removed') {
    [result] = await db
      .update(homeMembers)
      .set({ role: 'member', status: 'invited', invitedByUserId: inviterUserId, joinedAt: null })
      .where(eq(homeMembers.id, existing.id))
      .returning();
  } else {
    throw new ConflictError(
      existing.status === 'active' ? 'This person is already a member of this Home.' : 'This person already has a pending invite.'
    );
  }

  if (!result) throw new Error('Failed to create or reactivate a Home invite.');
  emitMembershipChanged(homeId);
  return result;
}

/** Accept a pending invite. Invitee only. */
export async function acceptInvite(homeId: string, memberId: string, userId: string): Promise<HomeMemberRow> {
  const [updated] = await getDb()
    .update(homeMembers)
    .set({ status: 'active', joinedAt: new Date() })
    .where(
      and(
        eq(homeMembers.id, memberId),
        eq(homeMembers.homeId, homeId),
        eq(homeMembers.memberUserId, userId),
        eq(homeMembers.status, 'invited')
      )
    )
    .returning();
  if (!updated) throw new NotFoundError('No pending invite found for you on this Home.');
  emitMembershipChanged(homeId);
  return updated;
}

/** Decline a pending invite. Invitee only. The row is retained as `removed`, same as a later `leaveHome`/`removeMember` — see `home_members` schema doc for why. */
export async function declineInvite(homeId: string, memberId: string, userId: string): Promise<HomeMemberRow> {
  const [updated] = await getDb()
    .update(homeMembers)
    .set({ status: 'removed' })
    .where(
      and(
        eq(homeMembers.id, memberId),
        eq(homeMembers.homeId, homeId),
        eq(homeMembers.memberUserId, userId),
        eq(homeMembers.status, 'invited')
      )
    )
    .returning();
  if (!updated) throw new NotFoundError('No pending invite found for you on this Home.');
  emitMembershipChanged(homeId);
  return updated;
}

/** Remove a member. Owner only, and never on oneself — an owner leaves via `leaveHome`, which alone enforces the sole-owner rule. */
export async function removeMember(homeId: string, actingUserId: string, targetMemberId: string): Promise<HomeMemberRow> {
  await assertActiveOwner(homeId, actingUserId);

  const [target] = await getDb().select().from(homeMembers).where(eq(homeMembers.id, targetMemberId)).limit(1);
  if (!target || target.homeId !== homeId) throw new NotFoundError('Member not found on this Home.');
  if (target.memberUserId === actingUserId) {
    throw new BadRequestError('Use "leave" to remove yourself from a Home, not this endpoint.');
  }

  const [updated] = await getDb()
    .update(homeMembers)
    .set({ status: 'removed' })
    .where(eq(homeMembers.id, targetMemberId))
    .returning();
  if (!updated) throw new NotFoundError('Member not found on this Home.');
  emitMembershipChanged(homeId);
  return updated;
}

/**
 * Leave a Home. Any active member may leave.
 *
 * The rule for an owner leaving (mirroring how a sole organizer is reasoned
 * about on the sibling Family feature): an owner may leave ONLY IF
 *   (a) another active owner remains to keep managing the Home, OR
 *   (b) they are the last active member of the Home entirely — leaving then
 *       DISSOLVES the Home (the `homes` row itself is deleted, which cascades
 *       to its membership, device metadata, and HA connection rows).
 * An owner who is the sole owner but NOT the sole member (other active
 * `member`-role people still depend on this Home) may not leave — they must
 * either promote another member or remove the rest first. There is currently
 * no "promote to owner" endpoint in this pass; this rule exists so that gap
 * fails safely (refusing the leave) rather than silently orphaning a Home
 * with members but no owner.
 */
export async function leaveHome(homeId: string, userId: string): Promise<{ dissolved: boolean }> {
  const membership = await assertActiveMember(homeId, userId);

  if (membership.role === 'owner') {
    const otherActiveOwners = await countOtherActiveOwners(homeId, userId);
    if (otherActiveOwners === 0) {
      const otherActiveMembers = await countOtherActiveMembers(homeId, userId);
      if (otherActiveMembers > 0) {
        throw new ForbiddenError(
          'You are the only owner of this Home and other members still belong to it. Remove them or add another owner before leaving.'
        );
      }
      // Sole owner, sole member: dissolve the Home. ON DELETE CASCADE on
      // home_members/home_device_metadata/home_connections takes care of
      // every dependent row.
      await getDb().delete(homes).where(eq(homes.id, homeId));
      emitMembershipChanged(homeId);
      return { dissolved: true };
    }
  }

  await getDb().update(homeMembers).set({ status: 'removed' }).where(eq(homeMembers.id, membership.id));
  emitMembershipChanged(homeId);
  return { dissolved: false };
}
