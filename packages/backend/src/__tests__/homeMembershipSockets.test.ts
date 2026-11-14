/**
 * A membership that ends takes its sockets out of the Home's room. Runs a real
 * Socket.IO server over the real `/homes` namespace and a REAL Postgres (set
 * DATABASE_URL, see `.env.example`); only Oxy is a loopback stand-in that
 * answers session validation for `session-of-<userId>`.
 */

import { afterAll, beforeAll, expect, test } from 'bun:test';
import { once } from 'node:events';
import { createServer, type Server as HttpServer } from 'node:http';
import { OxyServer } from '@oxy.so/core/server';
import { eq } from 'drizzle-orm';
import { Server } from 'socket.io';
import { io as connectSocket, type Socket } from 'socket.io-client';
import { closePostgres, connectPostgres, getDb } from '../db/postgres';
import { homes } from '../db/schema';
import { createHomesNamespace } from '../realtime/homesNamespace';
import { emitToHome, homeRoom } from '../realtime/socketRegistry';
import {
  acceptInvite,
  inviteMember,
  leaveHome,
  removeMember,
} from '../services/homeMembers.service';
import { createHome } from '../services/homes.service';
import { EVERY_ACCOUNT_EXISTS } from './fixtures/oxyAccounts';
import { inertTraffic } from './fixtures/inertTraffic';

const SESSION_PREFIX = 'session-of-';
const TIMEOUT_MS = 5000;

let authority: HttpServer;
let server: HttpServer;
let io: Server;
let oxy: OxyServer;
let origin = '';
const sockets: Socket[] = [];
const homeIds: string[] = [];

async function listen(target: HttpServer): Promise<string> {
  await new Promise<void>((resolve) => target.listen(0, '127.0.0.1', resolve));
  const address = target.address();
  if (!address || typeof address === 'string') throw new Error('Missing server address');
  return `http://127.0.0.1:${address.port}`;
}

beforeAll(async () => {
  await connectPostgres();
  authority = createServer((request, response) => {
    const prefix = `/session/validate-header/${SESSION_PREFIX}`;
    if (!request.url?.startsWith(prefix)) {
      response.writeHead(404).end();
      return;
    }
    const userId = decodeURIComponent(request.url.slice(prefix.length));
    response.setHeader('Content-Type', 'application/json');
    response.end(
      JSON.stringify({
        valid: true,
        user: { id: userId },
        sessionId: `${SESSION_PREFIX}${userId}`,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        lastActivity: new Date().toISOString(),
      }),
    );
  });
  oxy = new OxyServer({ baseURL: await listen(authority) });
  server = createServer();
  io = new Server(server);
  createHomesNamespace(io, oxy, inertTraffic);
  origin = await listen(server);
});

afterAll(async () => {
  for (const socket of sockets) socket.disconnect();
  await new Promise<void>((resolve) => io.close(() => resolve()));
  for (const homeId of homeIds) await getDb().delete(homes).where(eq(homes.id, homeId));
  await closePostgres();
  oxy.dispose();
  await new Promise<void>((resolve) => authority.close(() => resolve()));
});

function newUserId(label: string): string {
  return `user-${label}-${crypto.randomUUID()}`;
}

function bearerFor(userId: string): string {
  const payload = {
    userId,
    sessionId: `${SESSION_PREFIX}${userId}`,
    exp: Math.floor(Date.now() / 1000) + 300,
  };
  return `e30.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.fixture`;
}

async function connectAs(userId: string): Promise<Socket> {
  const socket = connectSocket(`${origin}/homes`, {
    auth: { token: bearerFor(userId) },
    transports: ['websocket'],
    reconnection: false,
  });
  sockets.push(socket);
  await once(socket, 'connect', { signal: AbortSignal.timeout(TIMEOUT_MS) });
  return socket;
}

async function join(socket: Socket, homeId: string): Promise<boolean> {
  const result: { ok: boolean } = await socket
    .timeout(TIMEOUT_MS)
    .emitWithAck('home:join', { homeId });
  return result.ok;
}

/** Every `probe` a socket receives, in order. */
function recordProbes(socket: Socket): number[] {
  const seen: number[] = [];
  socket.on('probe', (payload: { n: number }) => seen.push(payload.n));
  return seen;
}

/**
 * Broadcast probe `n` to the Home and wait until `member` has it. Then make one
 * round trip on each of `others`' own connections: the server sent the probe
 * before it answered that request, so a probe meant for them has arrived by
 * the time the answer does.
 */
async function probe(homeId: string, n: number, member: Socket, others: Socket[]): Promise<void> {
  const arrived = once(member, 'probe', { signal: AbortSignal.timeout(TIMEOUT_MS) });
  emitToHome(homeId, 'probe', { n });
  await arrived;
  for (const other of others) await join(other, crypto.randomUUID());
}

async function homeWithMember(): Promise<{
  homeId: string;
  owner: string;
  member: string;
  memberRowId: string;
}> {
  const owner = newUserId('owner');
  const member = newUserId('member');
  const { home } = await createHome(owner);
  homeIds.push(home.id);
  const invite = await inviteMember(home.id, owner, member, EVERY_ACCOUNT_EXISTS);
  await acceptInvite(home.id, invite.id, member);
  return { homeId: home.id, owner, member, memberRowId: invite.id };
}

test('a removed member stops receiving the Home events and cannot rejoin; the owner keeps them', async () => {
  const { homeId, owner, member, memberRowId } = await homeWithMember();
  const ownerSocket = await connectAs(owner);
  const memberSocket = await connectAs(member);
  expect(await join(ownerSocket, homeId)).toBe(true);
  expect(await join(memberSocket, homeId)).toBe(true);
  const memberProbes = recordProbes(memberSocket);

  await probe(homeId, 1, ownerSocket, [memberSocket]);
  expect(memberProbes).toEqual([1]);

  // The removed member is still told the membership changed, and then nothing.
  const told = once(memberSocket, 'home:membership-changed', {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  await removeMember(homeId, owner, memberRowId);
  await told;

  await probe(homeId, 2, ownerSocket, [memberSocket]);
  expect(memberProbes).toEqual([1]);
  expect(await join(memberSocket, homeId)).toBe(false);
});

test('a member who leaves stops receiving the Home events on every socket they hold', async () => {
  const { homeId, owner, member } = await homeWithMember();
  const ownerSocket = await connectAs(owner);
  const phone = await connectAs(member);
  const tablet = await connectAs(member);
  for (const socket of [ownerSocket, phone, tablet]) expect(await join(socket, homeId)).toBe(true);
  const phoneProbes = recordProbes(phone);
  const tabletProbes = recordProbes(tablet);

  await probe(homeId, 1, ownerSocket, [phone, tablet]);
  expect([phoneProbes, tabletProbes]).toEqual([[1], [1]]);

  await leaveHome(homeId, member);

  await probe(homeId, 2, ownerSocket, [phone, tablet]);
  expect([phoneProbes, tabletProbes]).toEqual([[1], [1]]);
});

test('dissolving a Home empties its room', async () => {
  const owner = newUserId('owner');
  const { home } = await createHome(owner);
  homeIds.push(home.id);
  const ownerSocket = await connectAs(owner);
  expect(await join(ownerSocket, home.id)).toBe(true);
  expect(io.of('/homes').adapter.rooms.get(homeRoom(home.id))?.size).toBe(1);

  expect(await leaveHome(home.id, owner)).toEqual({ dissolved: true });

  expect(io.of('/homes').adapter.rooms.get(homeRoom(home.id))).toBeUndefined();
});
