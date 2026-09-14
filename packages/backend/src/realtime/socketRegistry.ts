/**
 * Late-bound Socket.IO seam for service code that emits outside an HTTP
 * handler's request/response cycle — the same pattern as OxyHQ/Mention's
 * `runtime/socketServer.ts`. Importing this module never creates a namespace.
 */

import type { Namespace } from 'socket.io';

let homesNamespace: Namespace | undefined;

export function setHomesNamespace(namespace: Namespace): void {
  homesNamespace = namespace;
}

export function getHomesNamespace(): Namespace | undefined {
  return homesNamespace;
}

/** Broadcast `event` to every socket currently joined to `home:${homeId}`. No-ops if the namespace hasn't been created (e.g. in a unit test that never called `createHomesNamespace`). */
export function emitToHome(homeId: string, event: string, payload: unknown): void {
  homesNamespace?.to(`home:${homeId}`).emit(event, payload);
}
