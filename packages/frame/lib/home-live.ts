/**
 * The Home as it is right now: its devices, kept current over Willo's
 * `/homes` socket, and whether the frame can reach Willo at all. One store per
 * Home, read through `useSyncExternalStore`: the socket opens with the first
 * reader and closes with the last, and a reader re-renders only when the
 * snapshot it reads changes.
 *
 * The same socket carries the frame's own changes from the app
 * (`home:frame-updated`), written straight into the frame session so the
 * frame redraws with its new settings, and its removal (`home:frame-removed`),
 * which signs the frame out so it shows its code again.
 */

import type { LinkedHttpClient } from '@oxy.so/core';
import type { QueryClient } from '@tanstack/react-query';
import type { Device, Frame } from '@willo.sh/shared-types';
import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import { FRAME_SESSION_KEY, WILLO_API_URL, type FrameSession } from './willo';

export interface HomeLiveSnapshot {
  devices: Device[];
  /** Whether the frame's connection to Willo is up. */
  isOnline: boolean;
}

interface HomeLiveOptions {
  client: LinkedHttpClient;
  homeId: string;
  frameId: string;
  queryClient: QueryClient;
  /** Signs this frame out of Oxy (it was removed from the Home). */
  signOut: () => void;
}

interface HomeLiveStore {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => HomeLiveSnapshot;
}

const INITIAL: HomeLiveSnapshot = { devices: [], isOnline: false };

function replaceOrAppend(devices: Device[], device: Device): Device[] {
  const index = devices.findIndex((existing) => existing.id === device.id);
  return index === -1
    ? [...devices, device]
    : devices.map((existing, position) => (position === index ? device : existing));
}

function createHomeLive({
  client,
  homeId,
  frameId,
  queryClient,
  signOut,
}: HomeLiveOptions): HomeLiveStore {
  let snapshot = INITIAL;
  const listeners = new Set<() => void>();
  let socket: Socket | null = null;
  let handshake: AbortController | null = null;

  const update = (next: Partial<HomeLiveSnapshot>) => {
    snapshot = { ...snapshot, ...next };
    for (const listener of listeners) listener();
  };

  async function open() {
    handshake = new AbortController();
    const signal = handshake.signal;
    try {
      const response = await client.fetch(`${WILLO_API_URL}/homes/${homeId}/devices/live`, {
        signal,
      });
      if (!response.ok)
        throw new Error(`GET /homes/${homeId}/devices/live answered ${response.status}`);
      const live = (await response.json()) as { devices: Device[] };
      if (!signal.aborted) update({ devices: live.devices });
    } catch (error) {
      if (!signal.aborted) console.error(`Could not read Home ${homeId}'s devices:`, error);
    }
    if (signal.aborted) return;

    const connection = io(`${WILLO_API_URL}/homes`, {
      auth: (callback) => {
        client.getAccessToken(`${WILLO_API_URL}/homes`, { signal }).then(
          (token) => callback({ token }),
          // Let Socket.IO report the failure; never send a stale bearer.
          () => callback({}),
        );
      },
      transports: ['websocket'],
    });
    socket = connection;
    // Every (re)connection joins the Home again.
    connection.on('connect', () => {
      connection.emit('home:join', { homeId }, (ack: { ok: boolean } | undefined) => {
        if (ack?.ok) update({ isOnline: true });
        else console.error(`Willo refused this frame a seat in Home ${homeId}.`);
      });
    });
    connection.on('disconnect', () => update({ isOnline: false }));
    connection.on('home:devices-snapshot', (devices: Device[]) => update({ devices }));
    connection.on('home:device-updated', (device: Device) =>
      update({ devices: replaceOrAppend(snapshot.devices, device) }),
    );
    connection.on('home:frame-updated', (frame: Frame) => {
      if (frame.id !== frameId) return;
      const session: FrameSession = { kind: 'frame', frame };
      queryClient.setQueryData([FRAME_SESSION_KEY], session);
    });
    connection.on('home:frame-removed', ({ frameId: removed }: { frameId: string }) => {
      if (removed === frameId) signOut();
    });
  }

  function close() {
    handshake?.abort();
    handshake = null;
    socket?.disconnect();
    socket = null;
    snapshot = INITIAL;
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) void open();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) close();
      };
    },
    getSnapshot: () => snapshot,
  };
}

/** One store per frame (a frame shows one Home); a new frame or Home gets a fresh one. */
const stores = new Map<string, HomeLiveStore>();

export function useHomeLive(options: HomeLiveOptions): HomeLiveSnapshot {
  const key = `${options.homeId}:${options.frameId}`;
  let store = stores.get(key);
  if (!store) {
    store = createHomeLive(options);
    stores.set(key, store);
  }
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
