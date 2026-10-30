import type React from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import type { LinkedHttpClient } from '@oxy.so/core';
import type { Frame, UpdateFrameRequest } from '@willo.sh/shared-types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth, useOxy } from '@oxy.so/services/ui/client';
import { homeReducer, initialHomeState, type HomeAction, type HomeState } from './home-reducer';
import * as storage from '../storage';
import { createWilloTunnelProvider } from '../providers/willo-tunnel';
import { createDemoProvider } from '../providers/demo-home';
import type {
  Device,
  DeviceCommand,
  HomeActivityEvent,
  SmartHomeProvider,
} from '../providers/types';
import { unitSystemForLocale, type UnitSystem } from '../providers/unit-system';
import { useTranslation } from 'react-i18next';

const WILLO_API_URL = process.env.EXPO_PUBLIC_WILLO_API_URL;

/** React Query key of a Home's frames; the tunnel's frame events invalidate it. */
export const FRAMES_QUERY_KEY = 'willo-frames';

export type SheetOption = {
  label: string;
  description?: string;
  selected?: boolean;
  onPress: () => void;
};
export type Sheet =
  | { kind: 'menu'; title: string; description?: string; options: SheetOption[] }
  | { kind: 'realDevice'; title: string; device: Device }
  | { kind: 'camera'; title: string; garden?: boolean; snapshotUrl?: string | null }
  | { kind: 'message'; title: string; description: string }
  | null;

/**
 * The onboarding stage for THIS device's Willo session — not the same thing
 * as Oxy sign-in (`ScreenSurface` already gates on that separately, before
 * anything here even mounts).
 *  - `resolving`: waiting on Oxy auth to resolve and local storage to read.
 *  - `needs-home`: signed in, but this device has no `homeId` yet.
 *  - `needs-pairing`: a Home exists but has NEVER completed pairing (no
 *    tunnel secret exists yet) — the "enter this code in your Home
 *    Assistant" screen.
 *  - `ready`: this Home has completed pairing at least once. The real app
 *    renders — INCLUDING while the live tunnel is briefly down (a backend
 *    restart, the integration itself restarting): that's `tunnelConnected`
 *    going false, not a reason to re-block behind onboarding. Earlier this
 *    conflated "never paired" with "merely disconnected right now", and
 *    because the onboarding screen auto-requests a fresh pairing code on
 *    mount, a transient disconnect on an already-paired Home silently
 *    invalidated its still-good secret — turning a self-healing blip into a
 *    real lockout.
 */
export type HomeSetupStage = 'resolving' | 'needs-home' | 'needs-pairing' | 'ready';

/** One Home the signed-in person actively belongs to, as listed by `GET /homes/me`. */
export type HomeSummary = { id: string; name: string | null };

/** What the Home IS right now: which one, how far its setup got, its name and units. Changes rarely. */
type HomeData = {
  state: HomeState;
  setupStage: HomeSetupStage;
  /** The live tunnel connection, independent of `setupStage` — `ready` covers a paired Home whether or not it's currently connected, so a device tile that wants to show itself as offline/stale reads this instead. */
  tunnelConnected: boolean;
  /** The Home's own name, or a generic fallback for one created without a name — always ready to display, never null. */
  homeName: string;
  /**
   * When on, device-listing screens (Home, Devices) show ONLY the built-in
   * demo catalog and hide real Home Assistant devices — never a mix of the
   * two. Lets someone preview what a fully-stocked smart home looks and
   * feels like before (or instead of) connecting any real devices. Persisted
   * locally (a device-level preference, not Home data — nothing server-side
   * needs to know about it).
   */
  demoMode: boolean;
  /** Every Home the signed-in person actively belongs to. Empty until `GET /homes/me` answers (or if it never does). */
  homes: HomeSummary[];
  /** The Home this device is currently showing, or `null` while none is selected (first launch, or mid "create a new home"). */
  homeId: string | null;
  /**
   * The most recently issued pairing code for the current Home, or `null`
   * before one's been requested. Lives here, not as local state on the
   * pairing screen (`PairingStep` in `home-setup.tsx`), specifically so it
   * SURVIVES that screen unmounting — navigating away and back (Settings and
   * back, a web reload) used to silently request a brand-new code every
   * remount, which invalidates the previous one server-side
   * (`issuePairingCode` nulls any existing secret AND replaces the prior
   * code) with no warning, right as someone might be mid-typing the old one
   * into Home Assistant.
   */
  pairingCode: { code: string; expiresAt: string } | null;
};

/** What you can DO to the Home. Every member is stable for the life of the app. */
type HomeActions = {
  dispatch: React.Dispatch<HomeAction>;
  setSheet: React.Dispatch<React.SetStateAction<Sheet>>;
  notify: (message: string) => void;
  setDemoMode: (value: boolean) => void;
  /** Applies immediately, then saves to the Home; a failed save reverts and says so. */
  setUnitSystem: (value: UnitSystem) => void;
  /** Leaves the current Home — closing its connection so none of its devices leak into the next — and connects to `id` instead. Remembered on this device. */
  switchHome: (id: string) => void;
  /** Leaves the current Home and puts this device back at `needs-home`, so onboarding creates and pairs a new one. The caller navigates to `onboarding`. */
  startNewHome: () => void;
  createHome: (name?: string) => Promise<void>;
  requestPairingCode: () => Promise<{ code: string; expiresAt: string }>;
  /**
   * The DEVICE-initiated counterpart to `requestPairingCode`: a Willo Green
   * appliance generates its own claim code (shown on its Vite status/QR
   * screen, see OxyHQ/Willo#9), and this attaches it to the current Home
   * instead of the other way around — no code ever shown by this app, no
   * typing into Home Assistant. Hits `POST /homes/:id/claim-device`, which
   * this Home's `homeConnections` row already gets updated by server-side;
   * the tunnel itself connects on its own once the device's own poll picks
   * up the secret, same as a completed `requestPairingCode` pairing does.
   */
  claimDevice: (claimCode: string) => Promise<void>;
  /** This Home's real activity history (motion/door/safety sensor transitions), most recent first. Fetched fresh on every call — screens call this from their own mount effect rather than this context polling on their behalf. */
  fetchEvents: () => Promise<HomeActivityEvent[]>;
  /** This Home's Frame by Willo screens. Read through {@link useFrames}, which keeps them current. */
  fetchFrames: () => Promise<Frame[]>;
  /** Rename, move or reconfigure a frame; it shows the change at once. Answers the frame as saved. */
  updateFrame: (frameId: string, change: UpdateFrameRequest) => Promise<Frame>;
  /**
   * Remove a frame from the Home. When the signed-in person set it up, its
   * Oxy device is signed out of their account too, so it shows its QR again;
   * a frame someone else set up can only be signed out by them.
   */
  removeFrame: (frame: Frame) => Promise<{ deviceSignedOut: boolean }>;
  sendCommand: (id: string, command: DeviceCommand) => void;
  /** Snapshot bytes stay in this session's memory; image views receive no bearer. */
  fetchSnapshot: (url: string, signal: AbortSignal) => Promise<Blob>;
  sessionEpoch: number;
};

/** The transient UI the `Overlays` component draws on top of everything. */
type OverlayState = {
  sheet: Sheet;
  toast: string;
};

/** Why claiming a device failed, so the screen can say it in the person's language instead of showing a raw message. */
export class ClaimDeviceError extends Error {
  constructor(readonly reason: 'invalid-code' | 'failed') {
    super(
      reason === 'invalid-code'
        ? 'The claim code is invalid or has expired.'
        : 'Claiming the device failed.',
    );
  }
}

const HomeContext = createContext<HomeData | null>(null);
const HomeActionsContext = createContext<HomeActions | null>(null);
const DevicesContext = createContext<Device[] | null>(null);
/**
 * The Home's display units, alone in their own context because of WHO reads
 * them: every tile, every reading, the thermostat — dozens of components per
 * screen. Left in `HomeData` they would re-render all of those whenever the
 * tunnel reconnected, a sheet opened somewhere else or a pairing code arrived.
 * They change roughly never.
 */
const UnitSystemContext = createContext<UnitSystem | null>(null);
// Stored on the Home server-side so every member sees the same thing. Until a
// Home has loaded (and in demo mode, where there is none) it is this device's
// own regional default.
const OverlayContext = createContext<OverlayState | null>(null);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const { oxyServices } = useOxy();
  const subscribe = useCallback(
    (listener: () => void) => oxyServices.http.addTokenChangeListener(listener),
    [oxyServices],
  );
  const snapshot = useCallback(() => oxyServices.http.getSessionEpoch(), [oxyServices]);
  const epoch = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (
    <HomeSessionProvider key={epoch} sessionEpoch={epoch}>
      {children}
    </HomeSessionProvider>
  );
}

function HomeSessionProvider({
  children,
  sessionEpoch,
}: {
  children: React.ReactNode;
  sessionEpoch: number;
}) {
  const [state, dispatch] = useReducer(homeReducer, initialHomeState);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2700);
  }, []);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const { t } = useTranslation();
  const { oxyServices, currentLanguage, user: oxyUser } = useOxy();
  const queryClient = useQueryClient();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const linkedRef = useRef<LinkedHttpClient | null>(null);
  const releasedRef = useRef(false);
  const fetchWillo = useCallback<typeof fetch>(
    (input, init) => {
      if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch)
        return Promise.reject(new Error('The Willo session changed'));
      if (!WILLO_API_URL) return Promise.reject(new Error('Willo API URL is not configured'));
      linkedRef.current ??= oxyServices.createLinkedClient({ baseURL: WILLO_API_URL });
      return linkedRef.current.fetch(input, init);
    },
    [oxyServices, sessionEpoch],
  );
  useEffect(() => {
    releasedRef.current = false;
    return () => {
      releasedRef.current = true;
      linkedRef.current?.dispose();
      linkedRef.current = null;
    };
  }, [oxyServices]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [homes, setHomes] = useState<HomeSummary[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [rawHomeName, setRawHomeName] = useState<string | null>(null);
  const [setupStage, setSetupStage] = useState<HomeSetupStage>('resolving');
  const [tunnelConnected, setTunnelConnected] = useState(false);
  const providerRef = useRef<SmartHomeProvider | null>(null);
  const hasInitialized = useRef(false);
  // The Home the latest `connectHome` call is for. Every callback from an
  // older call checks it and does nothing once the person has switched away,
  // so a slow connect to the Home they just left can never overwrite the
  // devices, name or setup stage of the one they're on now.
  const connectingHomeIdRef = useRef<string | null>(null);
  // Written by `onPaired` before `onConnectionChange` ever reads it (see
  // `willo-tunnel.ts`'s `connect()` — both fire synchronously off the same
  // initial fetch, in that order) — a ref, not state, so the FIRST
  // `onConnectionChange` call in that same synchronous sequence never reads
  // a stale pre-render value the way `paired` state would.
  const pairedRef = useRef(false);
  const [demoMode, setDemoModeState] = useState(false);
  // Seeded from the SAME locale Oxy resolved for the UI language (the
  // account's when signed in, the device's otherwise) — never re-derived from
  // `Intl`, which would answer with the machine's region and disagree with it.
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() =>
    unitSystemForLocale(currentLanguage),
  );
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);

  // Demo mode replaces the real Home's name too — it's meant to look like a
  // complete, fully-set-up example home, not the real (possibly nameless)
  // one underneath it. "Spring Street" matches the reference UI's own demo
  // home name from before this app had any real Home Assistant data.
  const homeName = demoMode ? 'Spring Street' : (rawHomeName ?? t('homes.defaultName'));

  const fetchSnapshot = useCallback(
    async (url: string, signal: AbortSignal) => {
      const response = await fetchWillo(url, { signal, headers: { 'Cache-Control': 'no-store' } });
      if (!response.ok) throw new Error(`Camera snapshot failed (${response.status})`);
      const blob = await response.blob();
      if (
        releasedRef.current ||
        oxyServices.http.getSessionEpoch() !== sessionEpoch ||
        signal.aborted
      )
        throw new Error('The camera session changed');
      return blob;
    },
    [fetchWillo, oxyServices, sessionEpoch],
  );

  const connectHome = useCallback(
    async (id: string) => {
      if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch) return;
      connectingHomeIdRef.current = id;
      const isCurrent = () => connectingHomeIdRef.current === id;
      const provider = createWilloTunnelProvider({
        apiBaseUrl: WILLO_API_URL ?? '',
        homeId: id,
        fetch: fetchWillo,
        session: oxyServices.http,
        getAccessToken: (target, options) => {
          if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch)
            return Promise.reject(new Error('The Willo session changed'));
          if (!linkedRef.current)
            return Promise.reject(new Error('The Willo transport is not connected'));
          return linkedRef.current.getAccessToken(target, options);
        },
        onConnectionChange: (connected) => {
          if (!isCurrent()) return;
          setTunnelConnected(connected);
          setSetupStage(pairedRef.current || connected ? 'ready' : 'needs-pairing');
        },
        onHomeName: (name) => {
          if (isCurrent()) setRawHomeName(name);
        },
        onUnitSystem: (value) => {
          if (isCurrent()) setUnitSystemState(value);
        },
        onPaired: (paired) => {
          if (isCurrent()) pairedRef.current = paired;
        },
        onFramesChange: () => {
          if (isCurrent()) void queryClient.invalidateQueries({ queryKey: [FRAMES_QUERY_KEY] });
        },
      });
      // Held before `connect()` resolves, not after: leaving this Home while
      // it's still connecting has to be able to disconnect it.
      providerRef.current = provider;
      try {
        const initialDevices = await provider.connect();
        if (!isCurrent()) return;
        setDevices(initialDevices);
        provider.subscribe(setDevices);
      } catch (error) {
        if (!isCurrent()) return;
        console.error(`Failed to connect to Willo Home ${id}:`, error);
        notify(t('errors.unreachable'));
        setSetupStage('needs-pairing');
      }
    },
    [fetchWillo, oxyServices, sessionEpoch, notify, t, queryClient],
  );

  /** Closes the current Home's connection and clears everything read from it. */
  const leaveCurrentHome = useCallback(() => {
    connectingHomeIdRef.current = null;
    providerRef.current?.disconnect();
    providerRef.current = null;
    pairedRef.current = false;
    setDevices([]);
    setRawHomeName(null);
    setTunnelConnected(false);
    // A pairing code is scoped to whichever Home issued it — carrying one
    // over to a different Home (after switchHome/startNewHome) would show a
    // code that types into the WRONG Home's tunnel.
    setPairingCode(null);
  }, []);

  useEffect(
    () => () => {
      connectingHomeIdRef.current = null;
      providerRef.current?.disconnect();
      providerRef.current = null;
    },
    [],
  );

  const setDemoMode = useCallback(
    (value: boolean) => {
      setDemoModeState(value);
      storage
        .setItemAsync('demoMode', value ? 'true' : 'false')
        .catch((error: unknown) => console.error('Failed to save demo mode:', error));
      // Always start demo mode from a clean, predictable catalog rather than
      // wherever a previous demo session's toggling/dragging happened to
      // leave it.
      dispatch({ type: 'RESET' });
      // Turning demo mode ON is all the effect below: it builds the demo
      // provider and, on the way out, disconnects it. Turning it OFF is what
      // needs doing here, because only this side knows there is a real Home
      // to go back to.
      if (!value) {
        leaveCurrentHome();
        if (homeId) connectHome(homeId);
        else setSetupStage('needs-home');
      }
    },
    [dispatch, leaveCurrentHome, connectHome, homeId],
  );

  /**
   * The demo home's whole lifetime: built when demo mode goes on (or the UI
   * language changes, so its names follow), torn down when it goes off. One
   * owner, so a previous demo provider can never be left running — two of them
   * pushing devices is what left the app showing the home you just left.
   */
  useEffect(() => {
    if (!demoMode) return;
    let ignore = false;
    const provider = createDemoProvider(t);
    providerRef.current = provider;
    connectingHomeIdRef.current = null;
    setSetupStage('ready');
    setTunnelConnected(true);
    provider.connect().then((initialDevices) => {
      if (ignore) return;
      setDevices(initialDevices);
      provider.subscribe(setDevices);
    });
    return () => {
      ignore = true;
      provider.disconnect();
      // Only if nothing has taken its place: switching demo mode off connects
      // the real Home first, and that provider must not be cleared here.
      if (providerRef.current === provider) {
        providerRef.current = null;
        setDevices([]);
      }
    };
  }, [demoMode, t]);

  const switchHome = useCallback(
    (id: string) => {
      if (id === homeId) return;
      leaveCurrentHome();
      setSetupStage('resolving');
      setHomeId(id);
      storage
        .setItemAsync('homeId', id)
        .catch((error: unknown) =>
          console.error(`Failed to remember Home ${id} on this device:`, error),
        );
      connectHome(id);
    },
    [homeId, leaveCurrentHome, connectHome],
  );

  const startNewHome = useCallback(() => {
    leaveCurrentHome();
    setHomeId(null);
    setSetupStage('needs-home');
    storage
      .deleteItemAsync('homeId')
      .catch((error: unknown) =>
        console.error('Failed to forget the current Home on this device:', error),
      );
  }, [leaveCurrentHome]);

  useEffect(() => {
    // Waits on Oxy auth to resolve before doing anything, and — like the
    // Effects-run-twice-in-StrictMode guard this replaces — only ever runs
    // its real body once.
    if (hasInitialized.current || !isAuthResolved) return;
    hasInitialized.current = true;

    (async () => {
      if (!isAuthenticated) {
        setSetupStage('needs-home');
        return;
      }
      // Demo mode is read here rather than in its own effect so the two can't
      // race: a device that last used the demo catalog must not also open a
      // tunnel to its real Home. The real Home is still resolved below — it's
      // what switching demo mode back off returns to.
      const demo = (await storage.getItemAsync('demoMode')) === 'true';
      if (demo) setDemoModeState(true);
      const storedHomeId = await storage.getItemAsync('homeId');
      if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch) return;
      // The person's real Homes decide which one opens: the one this device
      // last used if they still belong to it, otherwise their first. That's
      // what lets a new device (or a reinstall) find an existing Home instead
      // of offering to create another. If the list can't be loaded, the
      // stored Home is still tried exactly as before — a flaky request must
      // never push someone who has a Home into setup.
      let activeHomeId = storedHomeId;
      try {
        const response = await fetchWillo(`${WILLO_API_URL}/homes/me`, {});
        if (!response.ok) throw new Error(`GET /homes/me answered ${response.status}`);
        const myHomes = ((await response.json()) as { home: HomeSummary }[]).map(({ home }) => ({
          id: home.id,
          name: home.name,
        }));
        if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch) return;
        setHomes(myHomes);
        activeHomeId =
          myHomes.find((home) => home.id === storedHomeId)?.id ?? myHomes[0]?.id ?? null;
      } catch (error) {
        console.error(
          `Failed to load Homes; falling back to this device's stored Home (${storedHomeId ?? 'none'}):`,
          error,
        );
      }
      if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch) return;
      if (!activeHomeId) {
        if (!demo) setSetupStage('needs-home');
        return;
      }
      if (activeHomeId !== storedHomeId) {
        await storage.setItemAsync('homeId', activeHomeId);
      }
      setHomeId(activeHomeId);
      // In demo mode the effect above owns the provider; the real Home is
      // remembered, not connected, until demo mode goes off.
      if (!demo) await connectHome(activeHomeId);
    })();
  }, [isAuthResolved, isAuthenticated, connectHome, fetchWillo, oxyServices, sessionEpoch]);

  const createHome = useCallback(
    async (name?: string) => {
      const response = await fetchWillo(`${WILLO_API_URL}/homes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(name ? { name, unitSystem } : { unitSystem }),
      });
      if (!response.ok) throw new Error('Could not create your home.');
      const { home } = (await response.json()) as { home: HomeSummary };
      if (releasedRef.current || oxyServices.http.getSessionEpoch() !== sessionEpoch)
        throw new Error('The Willo session changed');
      await storage.setItemAsync('homeId', home.id);
      setHomes((current) => [...current, { id: home.id, name: home.name }]);
      setHomeId(home.id);
      setRawHomeName(home.name);
      await connectHome(home.id);
    },
    [fetchWillo, connectHome, unitSystem, oxyServices, sessionEpoch],
  );

  const setUnitSystem = useCallback(
    (value: UnitSystem) => {
      setUnitSystemState(value);
      if (!homeId) return;
      fetchWillo(`${WILLO_API_URL}/homes/${homeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitSystem: value }),
      })
        .then((response) => {
          if (!response.ok) throw new Error(`PATCH /homes/${homeId} answered ${response.status}`);
        })
        .catch((error: unknown) => {
          console.error(`Failed to save unit system "${value}" for Home ${homeId}:`, error);
          setUnitSystemState(unitSystem);
          notify(t('errors.unitsNotSaved'));
        });
    },
    [unitSystem, homeId, fetchWillo, notify, t],
  );

  const requestPairingCode = useCallback(async () => {
    if (!homeId) throw new Error('Create a home before requesting a pairing code.');
    const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/pairing-code`, {
      method: 'POST',
    });
    if (!response.ok) throw new Error('Could not generate a pairing code.');
    // Issuing a code nulls any existing secret server-side (`issuePairingCode`) —
    // reflect that immediately rather than waiting for a future reconnect's
    // `onPaired` to catch up, so a mid-session re-pair (an owner replacing
    // their Home Assistant Green) can't race a stale `true` here.
    pairedRef.current = false;
    const result = (await response.json()) as { code: string; expiresAt: string };
    setPairingCode(result);
    return result;
  }, [homeId, fetchWillo]);

  const claimDevice = useCallback(
    async (claimCode: string) => {
      if (!homeId) throw new Error('Create a home before claiming a device.');
      const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/claim-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimCode }),
      });
      if (!response.ok)
        throw new ClaimDeviceError(response.status === 404 ? 'invalid-code' : 'failed');
      // Same reasoning as `requestPairingCode` above — the device now has a
      // fresh secret waiting for it; a stale local `paired` read must not
      // race ahead of the tunnel's own real `onPaired`/`onConnectionChange`.
      pairedRef.current = false;
    },
    [homeId, fetchWillo],
  );

  const fetchEvents = useCallback(async (): Promise<HomeActivityEvent[]> => {
    if (!homeId) return [];
    const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/events`, {});
    if (!response.ok) throw new Error('Could not load activity.');
    return (await response.json()) as HomeActivityEvent[];
  }, [homeId, fetchWillo]);

  const fetchFrames = useCallback(async (): Promise<Frame[]> => {
    if (!homeId) return [];
    const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/frames`, {});
    if (!response.ok) throw new Error(`GET /homes/${homeId}/frames answered ${response.status}`);
    return (await response.json()) as Frame[];
  }, [homeId, fetchWillo]);

  const updateFrame = useCallback(
    async (frameId: string, change: UpdateFrameRequest): Promise<Frame> => {
      if (!homeId) throw new Error('No Home is selected.');
      const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(change),
      });
      if (!response.ok) {
        throw new Error(`PATCH /homes/${homeId}/frames/${frameId} answered ${response.status}`);
      }
      return (await response.json()) as Frame;
    },
    [homeId, fetchWillo],
  );

  const removeFrame = useCallback(
    async (frame: Frame): Promise<{ deviceSignedOut: boolean }> => {
      if (!homeId) throw new Error('No Home is selected.');
      const response = await fetchWillo(`${WILLO_API_URL}/homes/${homeId}/frames/${frame.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`DELETE /homes/${homeId}/frames/${frame.id} answered ${response.status}`);
      }
      const { oxyDeviceId } = (await response.json()) as { oxyDeviceId: string | null };
      if (!oxyDeviceId || frame.addedByUserId !== oxyUser?.id) return { deviceSignedOut: false };
      await oxyServices.devices.remove(oxyDeviceId);
      return { deviceSignedOut: true };
    },
    [homeId, fetchWillo, oxyServices, oxyUser],
  );

  const sendCommand = useCallback(
    (id: string, command: DeviceCommand) => providerRef.current?.sendCommand(id, command),
    [],
  );

  // Four contexts, not one, because these four change at completely different
  // rates and a single value made every consumer re-render at the fastest of
  // them: a Home Assistant push (several a second) or a 2.7s toast re-rendered
  // every tile on screen. Each consumer now subscribes only to what it reads.
  const actions = useMemo(
    () => ({
      dispatch,
      setSheet,
      notify,
      setDemoMode,
      setUnitSystem,
      switchHome,
      startNewHome,
      createHome,
      requestPairingCode,
      claimDevice,
      fetchEvents,
      fetchFrames,
      updateFrame,
      removeFrame,
      sendCommand,
      fetchSnapshot,
      sessionEpoch,
    }),
    [
      dispatch,
      setSheet,
      notify,
      setDemoMode,
      setUnitSystem,
      switchHome,
      startNewHome,
      createHome,
      requestPairingCode,
      claimDevice,
      fetchEvents,
      fetchFrames,
      updateFrame,
      removeFrame,
      sendCommand,
      fetchSnapshot,
      sessionEpoch,
    ],
  );
  const data = useMemo(
    () => ({ state, setupStage, tunnelConnected, homeName, demoMode, homes, homeId, pairingCode }),
    [state, setupStage, tunnelConnected, homeName, demoMode, homes, homeId, pairingCode],
  );
  const overlay = useMemo(() => ({ sheet, toast }), [sheet, toast]);
  return (
    <HomeActionsContext.Provider value={actions}>
      <UnitSystemContext.Provider value={unitSystem}>
        <HomeContext.Provider value={data}>
          <DevicesContext.Provider value={devices}>
            <OverlayContext.Provider value={overlay}>{children}</OverlayContext.Provider>
          </DevicesContext.Provider>
        </HomeContext.Provider>
      </UnitSystemContext.Provider>
    </HomeActionsContext.Provider>
  );
}

/** Everything ABOUT the Home that changes slowly: which Home, how far setup got, its name and units. */
export function useHome(): HomeData {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}

/**
 * Everything you can DO to the Home. Nearly all of it is stable for the life
 * of the app; the handful that close over the current Home or the unit system
 * re-identify when those change, which is rare enough that reading this is
 * effectively free.
 */
export function useHomeActions(): HomeActions {
  const value = useContext(HomeActionsContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}

/** The Home's display units. Its own hook because the components that read it are the most numerous in the app — see `UnitSystemContext`. */
export function useUnitSystem(): UnitSystem {
  const value = useContext(UnitSystemContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}

/** The live device list — the fastest-changing thing here, so only the screens that list devices read it. */
export function useDevices(): Device[] {
  const value = useContext(DevicesContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}

/** The open sheet and the current toast, read by `Overlays` alone. */
export function useOverlayState(): OverlayState {
  const value = useContext(OverlayContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}

/**
 * This Home's Frame by Willo screens, kept current: refetched when a frame
 * registers, changes or goes (the tunnel's frame events), and every half
 * minute while shown, since whether a frame is online is its last heartbeat.
 */
export function useFrames() {
  const { homeId } = useHome();
  const { fetchFrames, sessionEpoch } = useHomeActions();
  return useQuery({
    queryKey: [FRAMES_QUERY_KEY, sessionEpoch, homeId],
    queryFn: fetchFrames,
    enabled: Boolean(homeId),
    refetchInterval: 30_000,
  });
}
