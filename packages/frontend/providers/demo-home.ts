import { Asset } from 'expo-asset';
import type { TFunction } from 'i18next';
import { assets } from '../data/assets';
import * as storage from '../storage';
import { DEMO_CATALOG } from './demo-catalog';
import type { Device, DeviceCapability, DeviceCommand, SmartHomeProvider } from './types';

/**
 * The demo's own still images, keyed by the camera they belong to. They live
 * here rather than in the catalogue because `require`-ing an image is a
 * bundler thing: the catalogue stays plain data that a test can read.
 */
const DEMO_STILLS: Record<string, number> = {
  'camera.living': assets.livingRoom,
  'camera.garden': assets.garden,
  'camera.doorbell': assets.delivery,
};

/** How long a demo cycle takes, and how often it ticks — short enough that starting the vacuum visibly does something. */
const CYCLE_MINUTES = 8;
const TICK_MS = 5000;

/**
 * The demo home behaves like a real one: turning a light off is a fact about
 * the house, not about the tab you did it in. State is kept under this key and
 * announced on this channel, so every open tab shows the change at once and a
 * reload picks up where the last one left off. Names aren't stored — those
 * come from the catalogue in whatever language the UI is in.
 */
const STORAGE_KEY = 'demoDevices';
const CHANNEL_NAME = 'willo-demo-home';
type StoredCapabilities = Record<string, DeviceCapability[]>;

const capabilitiesById = (devices: Device[]): StoredCapabilities =>
  Object.fromEntries(devices.map(device => [device.id, device.capabilities]));

export function createDemoProvider(t: TFunction): SmartHomeProvider {
  let devices: Device[] = DEMO_CATALOG.map(entry => ({
    id: entry.id,
    name: t(entry.nameKey),
    room: entry.roomKey === null ? null : t(entry.roomKey),
    domain: entry.domain,
    capabilities: entry.capabilities.map(capability =>
      capability.kind === 'camera' && DEMO_STILLS[entry.id] !== undefined
        // `Asset.fromModule` resolves a bundled image to a URL on web and on
        // native alike; `Image.resolveAssetSource` is native-only and threw
        // here the moment demo mode was switched on in a browser.
        ? { ...capability, snapshotUrl: Asset.fromModule(DEMO_STILLS[entry.id]).uri }
        : { ...capability }),
  }));
  const listeners = new Set<(devices: Device[]) => void>();
  const emit = () => listeners.forEach(listener => listener(devices));
  let ticker: ReturnType<typeof setInterval> | null = null;
  // `BroadcastChannel` is a web API; on native there are no other tabs to tell.
  const channel = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel(CHANNEL_NAME);

  /** Takes a set of capabilities from storage or another tab, keeping this tab's own (translated) names. */
  function adopt(stored: StoredCapabilities) {
    devices = devices.map(device => stored[device.id] ? { ...device, capabilities: stored[device.id] } : device);
  }

  /** Every change is announced to the other tabs and written down, so the demo home has one state rather than one per tab. */
  function publish() {
    const stored = capabilitiesById(devices);
    channel?.postMessage(stored);
    storage.setItemAsync(STORAGE_KEY, JSON.stringify(stored)).catch((error: unknown) => console.error('Failed to save the demo home:', error));
    emit();
  }

  if (channel) {
    channel.onmessage = (event: MessageEvent<StoredCapabilities>) => {
      adopt(event.data);
      emit();
    };
  }

  const update = (id: string, change: (capability: DeviceCapability) => DeviceCapability) => {
    devices = devices.map(device => device.id === id ? { ...device, capabilities: device.capabilities.map(change) } : device);
  };

  /**
   * A running appliance counts down; one that reaches zero reports itself
   * finished, the way a real washer does. Only the appliances that actually
   * moved get a new object — every screen memoises its tiles on device
   * identity, so re-cloning all fifty-odd of them every five seconds would
   * re-render the whole list to say nothing.
   */
  function tick() {
    let changed = false;
    devices = devices.map(device => {
      const counting = device.capabilities.some(capability => capability.kind === 'appliance' && capability.state === 'running' && capability.remainingMinutes !== null);
      if (!counting) return device;
      changed = true;
      return {
        ...device,
        capabilities: device.capabilities.map(capability => {
          if (capability.kind !== 'appliance' || capability.state !== 'running' || capability.remainingMinutes === null) return capability;
          const remaining = capability.remainingMinutes - 1;
          return remaining > 0
            ? { ...capability, remainingMinutes: remaining }
            : { ...capability, state: 'finished' as const, remainingMinutes: null };
        }),
      };
    });
    if (changed) publish();
  }

  return {
    async connect() {
      const saved = await storage.getItemAsync(STORAGE_KEY);
      if (saved) {
        try {
          adopt(JSON.parse(saved) as StoredCapabilities);
        } catch (error) {
          console.error('Ignoring an unreadable saved demo home:', error);
        }
      }
      ticker ??= setInterval(tick, TICK_MS);
      return devices;
    },
    disconnect() {
      if (ticker) clearInterval(ticker);
      ticker = null;
      channel?.close();
      listeners.clear();
    },
    subscribe(onDevices) {
      listeners.add(onDevices);
      return () => listeners.delete(onDevices);
    },
    sendCommand(id: string, command: DeviceCommand) {
      update(id, capability => {
        switch (command.kind) {
          case 'setOnOff':
            if (capability.kind === 'onOff') return { ...capability, on: command.on };
            if (capability.kind === 'brightness' || capability.kind === 'fanSpeed') return { ...capability, percent: command.on ? capability.percent ?? 100 : 0 };
            if (capability.kind === 'climate') return { ...capability, mode: command.on ? 'heat' : 'off' };
            return capability;
          case 'setBrightness':
            if (capability.kind === 'brightness') return { ...capability, percent: command.percent };
            if (capability.kind === 'onOff') return { ...capability, on: command.percent > 0 };
            return capability;
          case 'setFanSpeed':
            if (capability.kind === 'fanSpeed') return { ...capability, percent: command.percent };
            if (capability.kind === 'onOff') return { ...capability, on: command.percent > 0 };
            return capability;
          case 'setLocked':
            return capability.kind === 'lock' ? { ...capability, locked: command.locked } : capability;
          case 'setCoverPosition':
            return capability.kind === 'cover'
              ? { ...capability, position: capability.position === null ? null : command.percent, open: command.percent > 0 }
              : capability;
          case 'setApplianceState':
            return capability.kind === 'appliance'
              ? { ...capability, state: command.state, remainingMinutes: command.state === 'running' ? capability.remainingMinutes ?? CYCLE_MINUTES : capability.state === 'paused' ? capability.remainingMinutes : null }
              : capability;
          case 'setTargetTemperature':
            return capability.kind === 'climate' ? { ...capability, target: command.value } : capability;
          case 'setPlaying':
            return capability.kind === 'media' ? { ...capability, playing: command.playing } : capability;
          case 'setVolume':
            return capability.kind === 'media' ? { ...capability, volume: command.percent, playing: command.percent > 0 } : capability;
        }
      });
      publish();
    },
  };
}
