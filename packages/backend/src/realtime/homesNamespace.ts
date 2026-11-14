/**
 * The `/homes` Socket.IO namespace: one room per Home (`home:${homeId}`),
 * joinable only by that Home's active members.
 *
 * Auth mechanism: `oxy.middleware.socket()`, the exact method OxyHQ/Mention's own
 * backend wires up for its namespaces (`runtime/socketIoServer.ts`,
 * `createSocketNamespaces`). It validates the bearer token the client sends
 * as `socket.handshake.auth.token` against the Oxy API (decode + a live
 * session check — never a local JWT secret) and sets both
 * `socket.data.userId` and `socket.user.id` on success — this module reads
 * `socket.data.userId`, matching Mention's own `AuthenticatedPresenceSocket`
 * convention.
 *
 * Room membership is NOT inferred from the client's handshake: a socket must
 * explicitly ask to join a specific Home (`home:join`), and that ask is
 * checked against `home_members` (active status) on every attempt. Ending a
 * membership takes the person's sockets out of the room at once
 * (`removeUserFromHomeRoom`, through the `user:<id>` room every socket joins
 * on connect), so a revoked membership cannot keep receiving the Home's events.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { and, eq } from 'drizzle-orm';
import type { EcosystemTraffic, OxyServer } from '@oxy.so/core/server';
import { getDb } from '../db/postgres';
import { homeMembers } from '../db/schema';
import { homeRoom, setHomesNamespace, userRoom } from './socketRegistry';

const HOMES_NAMESPACE = '/homes';

type HomeSocket = Socket & { data: { userId?: string } };

async function isActiveMember(homeId: string, userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: homeMembers.id })
    .from(homeMembers)
    .where(
      and(
        eq(homeMembers.homeId, homeId),
        eq(homeMembers.memberUserId, userId),
        eq(homeMembers.status, 'active'),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/**
 * Join `homeId`'s room if `userId` is an active member of it. The membership is
 * read again AFTER joining: a removal that commits between the first read and
 * the join has already evicted the user's sockets, before this one was in the
 * room, so only the second read sees it. A removal that commits after the
 * second read evicts this socket itself.
 */
async function joinIfActiveMember(
  socket: Socket,
  homeId: string,
  userId: string,
): Promise<boolean> {
  if (!(await isActiveMember(homeId, userId))) return false;
  socket.join(homeRoom(homeId));
  if (await isActiveMember(homeId, userId)) return true;
  socket.leave(homeRoom(homeId));
  return false;
}

export function createHomesNamespace(
  io: SocketIOServer,
  oxy: OxyServer,
  traffic: EcosystemTraffic,
): void {
  const namespace = io.of(HOMES_NAMESPACE);
  namespace.use(oxy.middleware.socket());

  namespace.on('connection', (socket: HomeSocket) => {
    traffic.observeSocket(socket);

    const userId = socket.data.userId;
    if (!userId) {
      // Defensive: middleware.socket() already rejects a handshake with no valid
      // session before `connection` ever fires. A socket reaching here with
      // no userId means the auth contract changed underneath this code.
      socket.disconnect(true);
      return;
    }

    socket.join(userRoom(userId));

    socket.on(
      'home:join',
      (payload: { homeId?: unknown }, ack?: (result: { ok: boolean }) => void) => {
        const homeId = payload?.homeId;
        if (typeof homeId !== 'string' || !homeId) {
          ack?.({ ok: false });
          return;
        }
        joinIfActiveMember(socket, homeId, userId)
          .then((joined) => ack?.({ ok: joined }))
          .catch((error: unknown) => {
            console.error('Failed to check Home membership for socket join:', error);
            ack?.({ ok: false });
          });
      },
    );

    socket.on('home:leave', (payload: { homeId?: unknown }) => {
      if (typeof payload?.homeId === 'string') socket.leave(homeRoom(payload.homeId));
    });
  });

  setHomesNamespace(namespace);
}
