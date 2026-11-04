/**
 * Late-bound Socket.IO seam for service code that emits outside an HTTP
 * handler's request/response cycle — the same pattern as OxyHQ/Mention's
 * `runtime/socketServer.ts`. Importing this module never creates a namespace.
 *
 * Two kinds of room live in `/homes`: `home:<homeId>`, which every event about
 * a Home is broadcast to, and `user:<userId>`, which every socket of one Oxy
 * user joins on connect. The second is what lets a membership change reach
 * every socket a person has open, on every device, in one call.
 */

import type { Namespace } from 'socket.io';

let homesNamespace: Namespace | undefined;

export function setHomesNamespace(namespace: Namespace): void {
  homesNamespace = namespace;
}

export function homeRoom(homeId: string): string {
  return `home:${homeId}`;
}

export function userRoom(userId: string): string {
  return `user:${userId}`;
}

/** Broadcast `event` to every socket currently joined to `homeId`'s room. No-ops if the namespace hasn't been created (e.g. in a unit test that never called `createHomesNamespace`). */
export function emitToHome(homeId: string, event: string, payload: unknown): void {
  homesNamespace?.to(homeRoom(homeId)).emit(event, payload);
}

/**
 * Take every socket of `userId` out of `homeId`'s room. Called the moment that
 * person stops being an active member: without it a removed member's open
 * socket keeps receiving the Home's device and activity events, because the
 * membership check runs only when a socket asks to join.
 */
export function removeUserFromHomeRoom(homeId: string, userId: string): void {
  homesNamespace?.in(userRoom(userId)).socketsLeave(homeRoom(homeId));
}

/** Empty `homeId`'s room. Called when the Home itself is dissolved. */
export function closeHomeRoom(homeId: string): void {
  homesNamespace?.in(homeRoom(homeId)).socketsLeave(homeRoom(homeId));
}
