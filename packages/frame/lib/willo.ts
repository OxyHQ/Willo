/**
 * The frame's side of Willo: who this frame is, which Home it shows, and the
 * heartbeat that tells the app it is on. Every call goes through Oxy's linked
 * client for the Willo origin, so the frame never holds a token itself.
 */

import type { LinkedHttpClient, OxyServices } from '@oxy.so/core';
import { useOxy } from '@oxy.so/services/ui/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Frame, FrameHeartbeatRequest, RegisterFrameRequest } from '@willo.sh/shared-types';
import { Platform } from 'react-native';
import { measureFps } from './fps';

export const WILLO_API_URL = process.env.EXPO_PUBLIC_WILLO_API_URL ?? '';

/** What the frame's version reports in its diagnostics. */
const APP_VERSION = '1.0.0';

/** One linked client per Oxy client, for the life of the app. */
const clients = new WeakMap<OxyServices, LinkedHttpClient>();

export function willoClient(oxyServices: OxyServices): LinkedHttpClient {
  const existing = clients.get(oxyServices);
  if (existing) return existing;
  const client = oxyServices.createLinkedClient({ baseURL: WILLO_API_URL });
  clients.set(oxyServices, client);
  return client;
}

export interface HomeChoice {
  id: string;
  name: string | null;
}

/**
 * Where the frame stands with Willo: it is a frame (registered in a Home), or
 * the person who signed in has several Homes and must pick the one it is in.
 */
export type FrameSession =
  | { kind: 'frame'; frame: Frame }
  | { kind: 'choose-home'; homes: HomeChoice[] };

/** React Query key of the frame session; the Home's socket updates it in place. */
export const FRAME_SESSION_KEY = 'frame-session';

async function readJson<T>(response: Response, what: string): Promise<T> {
  if (!response.ok) throw new Error(`${what} answered ${response.status}`);
  return (await response.json()) as T;
}

export async function registerFrame(
  client: LinkedHttpClient,
  homeId: string,
  request: RegisterFrameRequest,
): Promise<Frame> {
  const response = await client.fetch(`${WILLO_API_URL}/homes/${homeId}/frames`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  return readJson<Frame>(response, `POST /homes/${homeId}/frames`);
}

/**
 * The frame this session is, registering it when it is not one yet and the
 * person has exactly one Home. A frame is recognised by its Oxy session on
 * the server, so a reload finds the same frame and its settings.
 */
async function loadFrameSession(
  client: LinkedHttpClient,
  registration: RegisterFrameRequest,
): Promise<FrameSession> {
  const own = await client.fetch(`${WILLO_API_URL}/frames/me`);
  if (own.ok) return { kind: 'frame', frame: (await own.json()) as Frame };
  if (own.status !== 404) throw new Error(`GET /frames/me answered ${own.status}`);

  const homes = await readJson<{ home: { id: string; name: string | null } }[]>(
    await client.fetch(`${WILLO_API_URL}/homes/me`),
    'GET /homes/me',
  );
  const [only] = homes;
  if (homes.length === 1 && only) {
    return { kind: 'frame', frame: await registerFrame(client, only.home.id, registration) };
  }
  return {
    kind: 'choose-home',
    homes: homes.map(({ home }) => ({ id: home.id, name: home.name })),
  };
}

/** What a frame tells Willo about itself when it registers. */
function useRegistration(name: string): RegisterFrameRequest {
  const { sessions, activeSessionId } = useOxy();
  const deviceId = sessions.find((session) => session.sessionId === activeSessionId)?.deviceId;
  return { name, oxyDeviceId: deviceId ?? null, platform: Platform.OS, appVersion: APP_VERSION };
}

export function useFrameSession(defaultName: string) {
  const { oxyServices } = useOxy();
  const registration = useRegistration(defaultName);
  return useQuery({
    queryKey: [FRAME_SESSION_KEY],
    queryFn: () => loadFrameSession(willoClient(oxyServices), registration),
    staleTime: Number.POSITIVE_INFINITY,
    retry: 3,
  });
}

/** The person picked the Home this frame is in. */
export function useChooseHome(defaultName: string) {
  const { oxyServices } = useOxy();
  const queryClient = useQueryClient();
  const registration = useRegistration(defaultName);
  return useMutation({
    mutationFn: (homeId: string) => registerFrame(willoClient(oxyServices), homeId, registration),
    onSuccess: (frame) => {
      const session: FrameSession = { kind: 'frame', frame };
      queryClient.setQueryData([FRAME_SESSION_KEY], session);
    },
  });
}

/** A heartbeat a minute: Willo shows the frame online, with how it is running. */
const HEARTBEAT_MS = 60_000;

/**
 * Checks in every minute while the frame is showing, with the frames per
 * second it measured just before. A query on an interval, not an effect:
 * React Query owns the timer and stops it when the frame stops showing.
 */
export function useHeartbeat(frameId: string | null) {
  const { oxyServices } = useOxy();
  return useQuery({
    queryKey: ['frame-heartbeat', frameId],
    enabled: frameId !== null,
    refetchInterval: HEARTBEAT_MS,
    refetchIntervalInBackground: true,
    queryFn: async () => {
      const report: FrameHeartbeatRequest = {
        platform: Platform.OS,
        appVersion: APP_VERSION,
        fps: await measureFps(),
      };
      const response = await willoClient(oxyServices).fetch(
        `${WILLO_API_URL}/frames/me/heartbeat`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(report),
        },
      );
      if (!response.ok) throw new Error(`POST /frames/me/heartbeat answered ${response.status}`);
      return Date.now();
    },
  });
}
