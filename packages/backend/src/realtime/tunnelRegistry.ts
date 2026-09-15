/**
 * Late-bound Socket.IO seam for the `/tunnel` namespace — the HA-facing
 * counterpart of `socketRegistry.ts` (which is browser-facing, `/homes`).
 * Unlike that one, nothing here ever needs to broadcast to every tunnel at
 * once, so there is no namespace reference to hold — only a per-Home socket
 * lookup, since a command/camera request always targets exactly one Home.
 *
 * ONE PROCESS ONLY. This is an in-memory `Map`, so "is this Home's tunnel
 * connected" and "send this Home's tunnel a command" only see sockets held by
 * THIS backend instance. Fine today — `willo`'s ECS service runs a single
 * task (see the infra plan) — but the moment it runs more than one, a
 * browser connected to instance A cannot reach a tunnel connected to
 * instance B without a shared backplane (Redis pub/sub is already
 * provisioned for this account — see `redis.tf` — and is the documented next
 * step, not a surprise).
 */

import { randomUUID } from 'node:crypto';
import type { Socket } from 'socket.io';
import { NotFoundError } from '../errors';

const socketsByHomeId = new Map<string, Socket>();

export function registerTunnelSocket(homeId: string, socket: Socket): void {
  // A second connection for the same Home (a restart racing the old
  // socket's own disconnect, or a duplicate integration install) replaces
  // rather than stacks — commands must go to exactly one place, and the
  // newest connection is the one actually talking to the real HA instance.
  socketsByHomeId.set(homeId, socket);
}

/** Only removes the mapping if `socket` is still the CURRENT one for `homeId` — a stale disconnect firing after a newer socket already replaced it must not evict the live one. */
export function unregisterTunnelSocket(homeId: string, socket: Socket): void {
  if (socketsByHomeId.get(homeId) === socket) {
    socketsByHomeId.delete(homeId);
  }
}

export function isHomeConnected(homeId: string): boolean {
  return socketsByHomeId.has(homeId);
}

export function getTunnelSocket(homeId: string): Socket | undefined {
  return socketsByHomeId.get(homeId);
}

/** `call_service` is fire-and-forget, matching the existing app's own HA command pattern (`providers/home-assistant.ts`'s `callService` — no result branch handled). No "not connected" error to surface: a browser sees the resulting (lack of) state change the same way it always has. */
export function sendCommand(homeId: string, message: { domain: string; service: string; entityId: string; serviceData: Record<string, unknown> }): void {
  getTunnelSocket(homeId)?.emit('call_service', message);
}

const CAMERA_SNAPSHOT_TIMEOUT_MS = 10_000;
const pendingCameraRequests = new Map<string, { resolve: (image: Buffer) => void; reject: (error: Error) => void }>();

/** Request/response is the one exception to this file's otherwise fire-and-forget shape — a camera card is asking a direct question and needs a direct answer, not a future state_changed event. */
export function requestCameraSnapshot(homeId: string, entityId: string): Promise<Buffer> {
  const socket = getTunnelSocket(homeId);
  if (!socket) return Promise.reject(new NotFoundError('This Home is not currently connected.'));

  const requestId = randomUUID();
  return new Promise<Buffer>((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingCameraRequests.delete(requestId);
      reject(new Error('Timed out waiting for a camera snapshot.'));
    }, CAMERA_SNAPSHOT_TIMEOUT_MS);

    pendingCameraRequests.set(requestId, {
      resolve: (image) => {
        clearTimeout(timeout);
        resolve(image);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    socket.emit('request_camera_snapshot', { requestId, entityId });
  });
}

/** Called by `tunnelNamespace.ts`'s `camera_snapshot_result` handler. A `requestId` with no pending entry (already timed out, or a stray/duplicate message) is silently ignored. */
export function resolveCameraSnapshot(requestId: string, image: Buffer): void {
  pendingCameraRequests.get(requestId)?.resolve(image);
  pendingCameraRequests.delete(requestId);
}

/** Used by tests to reset state between runs. */
export function clearTunnelRegistry(): void {
  socketsByHomeId.clear();
  pendingCameraRequests.clear();
}
