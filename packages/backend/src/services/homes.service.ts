import { and, eq, inArray, ne } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeMembers, homes } from '../db/schema';
import { ForbiddenError, NotFoundError } from '../errors';

export type HomeMemberRow = typeof homeMembers.$inferSelect;
export type HomeRow = typeof homes.$inferSelect;

/** Roster statuses shown to members — `removed` is retained in the table for history/re-invite, but is not part of "who's in this Home" today. */
const VISIBLE_MEMBER_STATUSES = ['invited', 'active'] as const;

/** A Home together with the current caller's role and the Home's visible roster. */
export interface HomeWithRoster {
  home: HomeRow;
  myRole: (typeof homeMembers.$inferSelect)['role'];
  members: HomeMemberRow[];
}

/** Create a Home; the caller becomes its first active owner. */
export async function createHome(userId: string, name?: string): Promise<HomeWithRoster> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [home] = await tx.insert(homes).values({ name: name ?? null }).returning();
    if (!home) throw new Error('Failed to create Home.');

    const now = new Date();
    const [membership] = await tx
      .insert(homeMembers)
      .values({
        homeId: home.id,
        memberUserId: userId,
        role: 'owner',
        status: 'active',
        joinedAt: now,
      })
      .returning();
    if (!membership) throw new Error('Failed to create the owning membership for a new Home.');

    return { home, myRole: membership.role, members: [membership] };
  });
}

/** Every Home the caller actively belongs to, each with its visible roster. */
export async function listHomesForUser(userId: string): Promise<HomeWithRoster[]> {
  const db = getDb();

  const myActiveMemberships = await db
    .select()
    .from(homeMembers)
    .where(and(eq(homeMembers.memberUserId, userId), eq(homeMembers.status, 'active')));
  if (myActiveMemberships.length === 0) return [];

  const homeIds = myActiveMemberships.map((membership) => membership.homeId);
  const [homeRows, allMembers] = await Promise.all([
    db.select().from(homes).where(inArray(homes.id, homeIds)),
    db
      .select()
      .from(homeMembers)
      .where(and(inArray(homeMembers.homeId, homeIds), inArray(homeMembers.status, VISIBLE_MEMBER_STATUSES))),
  ]);

  const homeById = new Map(homeRows.map((home) => [home.id, home]));
  const membersByHomeId = new Map<string, HomeMemberRow[]>();
  for (const member of allMembers) {
    const bucket = membersByHomeId.get(member.homeId);
    if (bucket) bucket.push(member);
    else membersByHomeId.set(member.homeId, [member]);
  }

  return myActiveMemberships.flatMap((membership) => {
    const home = homeById.get(membership.homeId);
    // The Home row cannot be gone while an active membership references it
    // (ON DELETE CASCADE removes the membership too), but a home deleted in
    // the same instant this list was built is not a caller-visible error —
    // just drop it from the response.
    if (!home) return [];
    return [{ home, myRole: membership.role, members: membersByHomeId.get(home.id) ?? [membership] }];
  });
}

/** The caller's own membership row for a Home, or `null` if they have none (of any status). */
export async function getMembership(homeId: string, userId: string): Promise<HomeMemberRow | null> {
  const [row] = await getDb()
    .select()
    .from(homeMembers)
    .where(and(eq(homeMembers.homeId, homeId), eq(homeMembers.memberUserId, userId)))
    .limit(1);
  return row ?? null;
}

/** Throws `NotFoundError` unless the caller is an ACTIVE member (owner or member) of the Home. Returns that membership row. */
export async function assertActiveMember(homeId: string, userId: string): Promise<HomeMemberRow> {
  const membership = await getMembership(homeId, userId);
  if (!membership || membership.status !== 'active') {
    throw new NotFoundError('Home not found.');
  }
  return membership;
}

/** Throws `NotFoundError`/`ForbiddenError` unless the caller is an ACTIVE owner of the Home. Returns that membership row. */
export async function assertActiveOwner(homeId: string, userId: string): Promise<HomeMemberRow> {
  const membership = await assertActiveMember(homeId, userId);
  if (membership.role !== 'owner') {
    throw new ForbiddenError('Only a Home owner may do this.');
  }
  return membership;
}

/** Count of ACTIVE owners of a Home other than `excludeUserId`. Used by `leaveHome`'s sole-owner rule. */
export async function countOtherActiveOwners(homeId: string, excludeUserId: string): Promise<number> {
  const rows = await getDb()
    .select({ id: homeMembers.id })
    .from(homeMembers)
    .where(
      and(
        eq(homeMembers.homeId, homeId),
        eq(homeMembers.role, 'owner'),
        eq(homeMembers.status, 'active'),
        ne(homeMembers.memberUserId, excludeUserId)
      )
    );
  return rows.length;
}

/** Count of ACTIVE members of a Home other than `excludeUserId` (any role). Used by `leaveHome`'s sole-owner rule. */
export async function countOtherActiveMembers(homeId: string, excludeUserId: string): Promise<number> {
  const rows = await getDb()
    .select({ id: homeMembers.id })
    .from(homeMembers)
    .where(
      and(eq(homeMembers.homeId, homeId), eq(homeMembers.status, 'active'), ne(homeMembers.memberUserId, excludeUserId))
    );
  return rows.length;
}
