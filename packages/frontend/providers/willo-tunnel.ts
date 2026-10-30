import type { LinkedHttpClient, OxyServices } from '@oxy.so/core';
import { io, type Socket } from 'socket.io-client';
import type { ApplianceState, Device } from '@willo.sh/shared-types';
import type { DeviceCommand, SmartHomeProvider } from './types';
import type { UnitSystem } from './unit-system';

const domainOf = (entityId: string) => entityId.split('.')[0];

const replaceOrAppend = <T extends { id: string }>(list: T[], item: T): T[] => {
  const index = list.findIndex((existing) => existing.id === item.id);
  return index === -1
    ? [...list, item]
    : list.map((existing, i) => (i === index ? item : existing));
};

type WilloTunnelCredentials = {
  apiBaseUrl: string;
  homeId: string;
  fetch: typeof globalThis.fetch;
  session: OxyServices['http'];
  getAccessToken: LinkedHttpClient['getAccessToken'];
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
  /**
   * A Frame by Willo screen in this Home registered, changed or was removed
   * (`home:frame-updated` / `home:frame-removed`). Says only THAT something
   * changed: the frames screen refetches what it shows.
   */
  onFramesChange: () => void;
};

/**
 * One Willo command as the Home Assistant service call that performs it. The
 * entity's own domain decides where a generic on/off lands (`switch.turn_on`,
 * `light.turn_on`); every other command belongs to exactly one domain, so it
 * names it outright.
 */
function homeAssistantService(
  domain: string,
  command: DeviceCommand,
): { domain: string; service: string; serviceData: Record<string, unknown> } {
  switch (command.kind) {
    case 'setOnOff':
      return { domain, service: command.on ? 'turn_on' : 'turn_off', serviceData: {} };
    case 'setBrightness':
      return {
        domain: 'light',
        service: 'turn_on',
        serviceData: { brightness_pct: Math.round(command.percent) },
      };
    case 'setFanSpeed':
      return {
        domain: 'fan',
        service: 'set_percentage',
        serviceData: { percentage: Math.round(command.percent) },
      };
    case 'setLocked':
      return { domain: 'lock', service: command.locked ? 'lock' : 'unlock', serviceData: {} };
    case 'setCoverPosition':
      return {
        domain: 'cover',
        service: 'set_cover_position',
        serviceData: { position: Math.round(command.percent) },
      };
    case 'setApplianceState':
      return { domain, service: APPLIANCE_SERVICES[command.state], serviceData: {} };
    case 'setTargetTemperature':
      return {
        domain: 'climate',
        service: 'set_temperature',
        serviceData: { temperature: command.value },
      };
    case 'setPlaying':
      return {
        domain: 'media_player',
        service: command.playing ? 'media_play' : 'media_pause',
        serviceData: {},
      };
    case 'setVolume':
      return {
        domain: 'media_player',
        service: 'volume_set',
        serviceData: { volume_level: Math.round(command.percent) / 100 },
      };
  }
}

/** `finished` is a state an appliance reaches on its own, never one asked for — stopping is the closest thing to request. */
const APPLIANCE_SERVICES: Record<ApplianceState, string> = {
  idle: 'stop',
  running: 'start',
  paused: 'pause',
  finished: 'stop',
};

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
        ? {
            ...capability,
            snapshotUrl: `${apiBaseUrl}/homes/${homeId}/devices/${device.id}/camera`,
          }
        : capability,
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
  const {
    apiBaseUrl,
    homeId,
    fetch: fetchWillo,
    session,
    getAccessToken,
    onConnectionChange,
    onHomeName,
    onUnitSystem,
    onPaired,
    onFramesChange,
  } = credentials;

  let devices: Device[] = [];
  let socket: Socket | null = null;
  // Set by `disconnect()`. Checked after `connect()`'s own fetch resolves, so
  // a disconnect that lands mid-connect (switching Homes quickly) never
  // opens a socket or reports state for the Home being left.
  let isDisconnected = false;
  const listeners = new Set<(devices: Device[]) => void>();
  const pendingHandshake = new AbortController();
  const epoch = session.getSessionEpoch();
  const current = () => !isDisconnected && session.getSessionEpoch() === epoch;
  const unsubscribeSession = session.addTokenChangeListener(() => {
    if (session.getSessionEpoch() === epoch) return;
    isDisconnected = true;
    pendingHandshake.abort();
    socket?.disconnect();
    listeners.clear();
  });
  const emit = () => listeners.forEach((listener) => listener(devices));

  async function connect(): Promise<Device[]> {
    const liveResponse = await fetchWillo(`${apiBaseUrl}/homes/${homeId}/devices/live`, {});
    if (!liveResponse.ok) throw new Error('Could not reach Willo.');
    const live = (await liveResponse.json()) as {
      connected: boolean;
      paired: boolean;
      devices: Device[];
      homeName: string | null;
      unitSystem: UnitSystem;
    };
    if (!current()) return [];
    devices = withCameraUrls(live.devices, apiBaseUrl, homeId);
    onHomeName(live.homeName);
    onUnitSystem(live.unitSystem);
    onPaired(live.paired);
    onConnectionChange(live.connected);

    socket = io(`${apiBaseUrl}/homes`, {
      auth: (callback) => {
        if (!current()) return;
        void getAccessToken(`${apiBaseUrl}/homes`, { signal: pendingHandshake.signal }).then(
          (token) => {
            if (current()) callback({ token });
          },
          () => {
            // Let Socket.IO report authentication failure; never send a stale bearer.
            if (current()) callback({});
          },
        );
      },
      transports: ['websocket'],
    });

    await new Promise<void>((resolve, reject) => {
      const connectingSocket = socket;
      if (!connectingSocket) return reject(new Error('The Home connection was closed'));
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        pendingHandshake.signal.removeEventListener('abort', onAbort);
        // Every reconnect must rejoin the Home; only failure retires this handler.
        if (error) connectingSocket.off('connect', onConnect);
        connectingSocket.off('connect_error', onError);
        if (error) {
          connectingSocket.disconnect();
          reject(error);
        } else resolve();
      };
      const onAbort = () => finish(new Error('The Home connection was cancelled'));
      const onError = (error: Error) => finish(error);
      const onConnect = () => {
        connectingSocket.emit('home:join', { homeId }, (ack: { ok: boolean }) => {
          if (ack?.ok) finish();
          else finish(new Error('Could not join this Home.'));
        });
      };
      const timeout = setTimeout(() => finish(new Error('The Home connection timed out')), 10_000);
      connectingSocket.on('connect', onConnect);
      connectingSocket.on('connect_error', onError);
      pendingHandshake.signal.addEventListener('abort', onAbort, { once: true });
      if (pendingHandshake.signal.aborted) onAbort();
    });
    if (!current() || !socket) return [];

    socket.on('home:devices-snapshot', (snapshot: Device[]) => {
      if (!current()) return;
      devices = withCameraUrls(snapshot, apiBaseUrl, homeId);
      emit();
    });
    socket.on('home:device-updated', (device: Device) => {
      if (!current()) return;
      devices = replaceOrAppend(devices, withCameraUrls([device], apiBaseUrl, homeId)[0] ?? device);
      emit();
    });
    socket.on('home:frame-updated', () => current() && onFramesChange());
    socket.on('home:frame-removed', () => current() && onFramesChange());
    socket.on(
      'home:connection-status',
      (status: { connected: boolean }) => current() && onConnectionChange(status.connected),
    );

    return devices;
  }

  return {
    connect,
    disconnect() {
      isDisconnected = true;
      pendingHandshake.abort();
      unsubscribeSession();
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
      if (!current()) return;
      const body = homeAssistantService(domainOf(id), command);

      fetchWillo(`${apiBaseUrl}/homes/${homeId}/devices/${id}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
        .then((response) => {
          if (!response.ok) throw new Error(`Device command failed (${response.status})`);
        })
        .catch((error: unknown) => console.error('Failed to send a device command:', error));
    },
  };
}
