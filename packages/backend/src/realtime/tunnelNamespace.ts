/**
 * The `/tunnel` Socket.IO namespace: the Home Assistant side of the tunnel.
 * One persistent connection per Home, held by that Home's Willo custom
 * integration — never a browser, never an Oxy user. See
 * `services/homeTunnel.service.ts`'s file comment for the full design and
 * `realtime/homesNamespace.ts` for the browser-facing counterpart this
 * relays into.
 *
 * DELIBERATELY A SEPARATE NAMESPACE from `/homes`, not a second auth path
 * bolted onto it: `/homes` authenticates a human's Oxy bearer token against
 * the Oxy API; this authenticates a per-Home secret against a local hash.
 * Mixing the two would mean either namespace's auth middleware has to guess
 * which kind of caller it's looking at.
 */

import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  applyDeviceUpdate,
  authenticateTunnel,
  markTunnelConnected,
  markTunnelDisconnected,
  saveDeviceSnapshot,
} from '../services/homeTunnel.service';
import { emitToHome } from './socketRegistry';
import { registerTunnelSocket, resolveCameraSnapshot, unregisterTunnelSocket } from './tunnelRegistry';

const TUNNEL_NAMESPACE = '/tunnel';

type TunnelSocket = Socket & { data: { homeId?: string } };

export function createTunnelNamespace(io: SocketIOServer): void {
  const namespace = io.of(TUNNEL_NAMESPACE);

  namespace.use((socket: TunnelSocket, next) => {
    const { homeId, secret } = socket.handshake.auth as { homeId?: unknown; secret?: unknown };
    if (typeof homeId !== 'string' || typeof secret !== 'string' || !homeId || !secret) {
      next(new Error('A tunnel connection requires homeId and secret.'));
      return;
    }

    authenticateTunnel(homeId, secret)
      .then((ok) => {
        if (!ok) {
          next(new Error('Invalid Home tunnel credentials.'));
          return;
        }
        socket.data.homeId = homeId;
        next();
      })
      .catch((error: unknown) => next(error instanceof Error ? error : new Error(String(error))));
  });

  namespace.on('connection', (socket: TunnelSocket) => {
    const homeId = socket.data.homeId;
    if (!homeId) {
      // Defensive: the auth middleware above already refuses a handshake
      // without one before `connection` ever fires.
      socket.disconnect(true);
      return;
    }

    registerTunnelSocket(homeId, socket);
    markTunnelConnected(homeId)
      .then(() => emitToHome(homeId, 'home:connection-status', { connected: true }))
      .catch((error: unknown) => console.error(`Failed to record tunnel connect for Home ${homeId}:`, error));

    socket.on('state_snapshot', (devices: unknown[]) => {
      saveDeviceSnapshot(homeId, devices)
        .then(() => emitToHome(homeId, 'home:devices-snapshot', devices))
        .catch((error: unknown) => console.error(`Failed to save device snapshot for Home ${homeId}:`, error));
    });

    socket.on('state_changed', (device: { id: string } & Record<string, unknown>) => {
      if (!device?.id) return;
      applyDeviceUpdate(homeId, device)
        .then(() => emitToHome(homeId, 'home:device-updated', device))
        .catch((error: unknown) => console.error(`Failed to apply device update for Home ${homeId}:`, error));
    });

    socket.on('camera_snapshot_result', (payload: { requestId?: string; imageBase64?: string }) => {
      if (!payload?.requestId || !payload.imageBase64) return;
      resolveCameraSnapshot(payload.requestId, Buffer.from(payload.imageBase64, 'base64'));
    });

    socket.on('disconnect', () => {
      unregisterTunnelSocket(homeId, socket);
      markTunnelDisconnected(homeId)
        .then(() => emitToHome(homeId, 'home:connection-status', { connected: false }))
        .catch((error: unknown) => console.error(`Failed to record tunnel disconnect for Home ${homeId}:`, error));
    });
  });
}
