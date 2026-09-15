import { io, type Socket } from 'socket.io-client';
import type { Device, SmartHomeProvider } from './types';
import type { UnitSystem } from './unit-system';

const domainOf = (entityId: string) => entityId.split('.')[0];

const replaceOrAppend = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex((existing) => existing.id === item.id);
  return index === -1 ? [...list, item] : list.map((existing, i) => (i === index ? item : existing));
};

type WilloTunnelCredentials = {
  apiBaseUrl: string;
  homeId: string;
  /** Synchronous — `@oxy.so/services`' `oxyServices.getAccessToken()`, read fresh on every call rather than captured once. */
  getAccessToken: () => string | null;
  /** Not part of `SmartHomeProvider` (every screen that lists devices only needs `Device[]`) — an extra credential-bag field this ONE concrete provider reports through, the same shape `createHomeAssistantProvider`'s old `onRefreshToken` used. */
  onConnectionChange: (connected: boolean) => void;
  /** Same reasoning as `onConnectionChange` — the Home's own name, read off `GET .../devices/live`'s response. */
  onHomeName: (name: string | null) => void;
  /** Same reasoning as `onHomeName` — the Home's shared unit system, read off the same response. */
  onUnitSystem: (unitSystem: UnitSystem) => void;
  /**
   * Fired once, from the initial `GET .../devices/live` response only — a
   * Home either has completed pairing or it hasn't, and only an explicit
   * `requestPairingCode()` call (never a mere reconnect) changes that, so
   * there's no live socket event for it the way `onConnectionChange` has.
   */
  onPaired: (paired: boolean) => void;
};

function authHeaders(getAccessToken: () => string | null): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Rewrites a camera device's `snapshotUrl` to Willo's own backend endpoint.
 * The tunnel/integration side has no reason to know Willo's public API host,
 * so it never sets this — it's filled in here, the one place that knows
 * both `apiBaseUrl` and `homeId`.
 */
function withCameraUrls(devices: Device[], apiBaseUrl: string, homeId: string): Device[] {
  return devices.map((device) => ({
    ...device,
    capabilities: device.capabilities.map((capability) =>
      capability.kind === 'camera'
        ? { ...capability, snapshotUrl: `${apiBaseUrl}/homes/${homeId}/devices/${device.id}/camera` }
        : capability
    ),
  }));
}

/**
 * Talks to WILLO's backend, never to Home Assistant directly — the backend
 * relays to a Home over its own persistent tunnel (`realtime/tunnelNamespace.ts`
 * on the backend), so this provider never hits browser Mixed-Content policy
 * the way the old direct-to-HA `createHomeAssistantProvider` did. Device
 * translation (HA entity -> Willo's `Device` shape) now happens in the Home
 * Assistant integration itself, so every device this receives already
 * matches `providers/types.ts` exactly — there is no HA-specific parsing
 * left in this file at all.
 */
export function createWilloTunnelProvider(credentials: WilloTunnelCredentials): SmartHomeProvider {
  const { apiBaseUrl, homeId, getAccessToken, onConnectionChange, onHomeName, onUnitSystem, onPaired } = credentials;

  let devices: Device[] = [];
  let socket: Socket | null = null;
  // Set by `disconnect()`. Checked after `connect()`'s own fetch resolves, so
  // a disconnect that lands mid-connect (switching Homes quickly) never
  // opens a socket or reports state for the Home being left.
  let isDisconnected = false;
  const listeners = new Set<(devices: Device[]) => void>();
  const emit = () => listeners.forEach((listener) => listener(devices));

  async function connect(): Promise<Device[]> {
    const liveResponse = await fetch(`${apiBaseUrl}/homes/${homeId}/devices/live`, {
      headers: authHeaders(getAccessToken),
    });
    if (!liveResponse.ok) throw new Error('Could not reach Willo.');
    const live = (await liveResponse.json()) as { connected: boolean; paired: boolean; devices: Device[]; homeName: string | null; unitSystem: UnitSystem };
    if (isDisconnected) return [];
    devices = withCameraUrls(live.devices, apiBaseUrl, homeId);
    onHomeName(live.homeName);
    onUnitSystem(live.unitSystem);
    onPaired(live.paired);
    onConnectionChange(live.connected);

    socket = io(`${apiBaseUrl}/homes`, { auth: { token: getAccessToken() }, transports: ['websocket'] });

    await new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        socket?.emit('home:join', { homeId }, (ack: { ok: boolean }) => {
          if (ack?.ok) resolve();
          else reject(new Error('Could not join this Home.'));
        });
      };
      socket?.on('connect', onConnect);
      socket?.on('connect_error', reject);
    });
    if (isDisconnected || !socket) return [];

    socket.on('home:devices-snapshot', (snapshot: Device[]) => {
      devices = withCameraUrls(snapshot, apiBaseUrl, homeId);
      emit();
    });
    socket.on('home:device-updated', (device: Device) => {
      devices = replaceOrAppend(devices, withCameraUrls([device], apiBaseUrl, homeId)[0] ?? device);
      emit();
    });
    socket.on('home:connection-status', (status: { connected: boolean }) => onConnectionChange(status.connected));

    return devices;
  }

  return {
    connect,
    disconnect() {
      isDisconnected = true;
      socket?.removeAllListeners();
      socket?.disconnect();
      socket = null;
      listeners.clear();
    },
    subscribe(onDevices) {
      listeners.add(onDevices);
      return () => listeners.delete(onDevices);
    },
    sendCommand(id, command) {
      const domain = domainOf(id);
      const body =
        command.kind === 'setOnOff'
          ? { domain, service: command.on ? 'turn_on' : 'turn_off', serviceData: {} }
          : command.kind === 'setBrightness'
            ? { domain: 'light', service: 'turn_on', serviceData: { brightness_pct: Math.round(command.percent) } }
            : { domain: 'fan', service: 'set_percentage', serviceData: { percentage: Math.round(command.percent) } };

      fetch(`${apiBaseUrl}/homes/${homeId}/devices/${id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders(getAccessToken) },
        body: JSON.stringify(body),
      }).catch((error: unknown) => console.error('Failed to send a device command:', error));
    },
  };
}
