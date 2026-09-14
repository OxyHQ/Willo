/**
 * The `/homes` Socket.IO namespace: one room per Home (`home:${homeId}`),
 * joinable only by that Home's active members.
 *
 * Auth mechanism: `oxy.authSocket()`, the exact method OxyHQ/Mention's own
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
 * checked against `home_members` (active status) on every attempt — a stale
 * or revoked membership cannot keep a socket in a room it should no longer
 * see, because nothing lets a socket join a room without this check running
 * first.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import { and, eq } from 'drizzle-orm';
import type { OxyServices } from '@oxy.so/core';
import { getDb } from '../db/postgres';
import { homeMembers } from '../db/schema';
import { setHomesNamespace } from './socketRegistry';

const HOMES_NAMESPACE = '/homes';

type HomeSocket = Socket & { data: { userId?: string } };

async function isActiveMember(homeId: string, userId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: homeMembers.id })
    .from(homeMembers)
    .where(and(eq(homeMembers.homeId, homeId), eq(homeMembers.memberUserId, userId), eq(homeMembers.status, 'active')))
    .limit(1);
  return Boolean(row);
}

export function createHomesNamespace(io: SocketIOServer, oxy: OxyServices): void {
  const namespace = io.of(HOMES_NAMESPACE);
  namespace.use(oxy.authSocket());

  namespace.on('connection', (socket: HomeSocket) => {
    const userId = socket.data.userId;
    if (!userId) {
      // Defensive: authSocket() already rejects a handshake with no valid
      // session before `connection` ever fires. A socket reaching here with
      // no userId means the auth contract changed underneath this code.
      socket.disconnect(true);
      return;
    }

    socket.on('home:join', (payload: { homeId?: string }, ack?: (result: { ok: boolean }) => void) => {
      const homeId = payload?.homeId;
      if (!homeId) {
        ack?.({ ok: false });
        return;
      }
      isActiveMember(homeId, userId)
        .then((allowed) => {
          if (!allowed) {
            ack?.({ ok: false });
            return;
          }
          socket.join(`home:${homeId}`);
          ack?.({ ok: true });
        })
        .catch((error: unknown) => {
          console.error('Failed to check Home membership for socket join:', error);
          ack?.({ ok: false });
        });
    });

    socket.on('home:leave', (payload: { homeId?: string }) => {
      if (payload?.homeId) socket.leave(`home:${payload.homeId}`);
    });
  });

  setHomesNamespace(namespace);
}
