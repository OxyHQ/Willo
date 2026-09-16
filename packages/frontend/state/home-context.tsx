import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth, useOxy } from '@oxy.so/services';
import { homeReducer, initialHomeState, type HomeAction, type HomeState, type DeviceKey } from './home-reducer';
import * as storage from '../storage';
import { createWilloTunnelProvider } from '../providers/willo-tunnel';
import type { Device, DeviceCommand, HomeActivityEvent, SmartHomeProvider } from '../providers/types';
import { unitSystemForLocale, type UnitSystem } from '../providers/unit-system';
import { useTranslation } from 'react-i18next';

const WILLO_API_URL = process.env.EXPO_PUBLIC_WILLO_API_URL;

export type SheetOption = { label: string; description?: string; selected?: boolean; onPress: () => void };
export type Sheet =
  | { kind: 'menu'; title: string; description?: string; options: SheetOption[] }
  | { kind: 'device'; title: string; id: DeviceKey }
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

type HomeContextValue = {
  state: HomeState;
  dispatch: React.Dispatch<HomeAction>;
  sheet: Sheet;
  setSheet: React.Dispatch<React.SetStateAction<Sheet>>;
  toast: string;
  notify: (message: string) => void;
  devices: Device[];
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
  setDemoMode: (value: boolean) => void;
  /**
   * The Home's shared display units, stored on the Home server-side so every
   * member sees the same thing. Until a Home has loaded (and in demo mode with
   * no Home at all) it's this device's own regional default.
   */
  unitSystem: UnitSystem;
  /** Applies immediately, then saves to the Home; a failed save reverts and says so. */
  setUnitSystem: (value: UnitSystem) => void;
  /** Every Home the signed-in person actively belongs to. Empty until `GET /homes/me` answers (or if it never does). */
  homes: HomeSummary[];
  /** The Home this device is currently showing, or `null` while none is selected (first launch, or mid "create a new home"). */
  homeId: string | null;
  /** Leaves the current Home — closing its connection so none of its devices leak into the next — and connects to `id` instead. Remembered on this device. */
  switchHome: (id: string) => void;
  /** Leaves the current Home and puts this device back at `needs-home`, so onboarding creates and pairs a new one. The caller navigates to `onboarding`. */
  startNewHome: () => void;
  createHome: (name?: string) => Promise<void>;
  requestPairingCode: () => Promise<{ code: string; expiresAt: string }>;
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
  sendCommand: (id: string, command: DeviceCommand) => void;
  /** `{ Authorization: 'Bearer …' }`, or `{}` if no session token is available yet — for the rare direct fetch/`<Image>` load (camera snapshots) that needs to authenticate itself outside the provider. */
  getAuthHeaders: () => Record<string, string>;
};

/** Why claiming a device failed, so the screen can say it in the person's language instead of showing a raw message. */
export class ClaimDeviceError extends Error {
  constructor(readonly reason: 'invalid-code' | 'failed') {
    super(reason === 'invalid-code' ? 'The claim code is invalid or has expired.' : 'Claiming the device failed.');
  }
}

const HomeContext = createContext<HomeContextValue | null>(null);

export function HomeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(homeReducer, initialHomeState);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notify = useCallback((message: string) => {
    setToast(message);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(''), 2700);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const { t } = useTranslation();
  const { oxyServices, currentLanguage } = useOxy();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const getAccessToken = useCallback(() => oxyServices.getAccessToken(), [oxyServices]);

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
  const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => unitSystemForLocale(currentLanguage));
  const [pairingCode, setPairingCode] = useState<{ code: string; expiresAt: string } | null>(null);

  useEffect(() => {
    let ignore = false;
    storage.getItemAsync('demoMode').then((value) => {
      if (!ignore) setDemoModeState(value === 'true');
    });
    return () => {
      ignore = true;
    };
  }, []);

  const setDemoMode = useCallback(
    (value: boolean) => {
      setDemoModeState(value);
      storage.setItemAsync('demoMode', value ? 'true' : 'false').catch((error: unknown) => console.error('Failed to save demo mode:', error));
      // Always start demo mode from a clean, predictable catalog rather than
      // wherever a previous demo session's toggling/dragging happened to
      // leave it.
      if (value) dispatch({ type: 'RESET' });
    },
    [dispatch]
  );

  // Demo mode replaces the real Home's name too — it's meant to look like a
  // complete, fully-set-up example home, not the real (possibly nameless)
  // one underneath it. "Spring Street" matches the reference UI's own demo
  // home name from before this app had any real Home Assistant data.
  const homeName = demoMode ? 'Spring Street' : (rawHomeName ?? t('homes.defaultName'));

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const connectHome = useCallback(
    async (id: string) => {
      connectingHomeIdRef.current = id;
      const isCurrent = () => connectingHomeIdRef.current === id;
      const provider = createWilloTunnelProvider({
        apiBaseUrl: WILLO_API_URL ?? '',
        homeId: id,
        getAccessToken,
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
    [getAccessToken, notify, t]
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

  const switchHome = useCallback(
    (id: string) => {
      if (id === homeId) return;
      leaveCurrentHome();
      setSetupStage('resolving');
      setHomeId(id);
      storage.setItemAsync('homeId', id).catch((error: unknown) => console.error(`Failed to remember Home ${id} on this device:`, error));
      connectHome(id);
    },
    [homeId, leaveCurrentHome, connectHome]
  );

  const startNewHome = useCallback(() => {
    leaveCurrentHome();
    setHomeId(null);
    setSetupStage('needs-home');
    storage.deleteItemAsync('homeId').catch((error: unknown) => console.error('Failed to forget the current Home on this device:', error));
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
      const storedHomeId = await storage.getItemAsync('homeId');
      // The person's real Homes decide which one opens: the one this device
      // last used if they still belong to it, otherwise their first. That's
      // what lets a new device (or a reinstall) find an existing Home instead
      // of offering to create another. If the list can't be loaded, the
      // stored Home is still tried exactly as before — a flaky request must
      // never push someone who has a Home into setup.
      let activeHomeId = storedHomeId;
      try {
        const response = await fetch(`${WILLO_API_URL}/homes/me`, { headers: getAuthHeaders() });
        if (!response.ok) throw new Error(`GET /homes/me answered ${response.status}`);
        const myHomes = ((await response.json()) as { home: HomeSummary }[]).map(({ home }) => ({ id: home.id, name: home.name }));
        setHomes(myHomes);
        activeHomeId = myHomes.find((home) => home.id === storedHomeId)?.id ?? myHomes[0]?.id ?? null;
      } catch (error) {
        console.error(`Failed to load Homes; falling back to this device's stored Home (${storedHomeId ?? 'none'}):`, error);
      }
      if (!activeHomeId) {
        setSetupStage('needs-home');
        return;
      }
      if (activeHomeId !== storedHomeId) {
        await storage.setItemAsync('homeId', activeHomeId);
      }
      setHomeId(activeHomeId);
      await connectHome(activeHomeId);
    })();
  }, [isAuthResolved, isAuthenticated, connectHome, getAuthHeaders]);

  const createHome = useCallback(
    async (name?: string) => {
      const response = await fetch(`${WILLO_API_URL}/homes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(name ? { name, unitSystem } : { unitSystem }),
      });
      if (!response.ok) throw new Error('Could not create your home.');
      const { home } = (await response.json()) as { home: HomeSummary };
      await storage.setItemAsync('homeId', home.id);
      setHomes((current) => [...current, { id: home.id, name: home.name }]);
      setHomeId(home.id);
      setRawHomeName(home.name);
      await connectHome(home.id);
    },
    [getAuthHeaders, connectHome, unitSystem]
  );

  const setUnitSystem = useCallback(
    (value: UnitSystem) => {
      setUnitSystemState(value);
      if (!homeId) return;
      fetch(`${WILLO_API_URL}/homes/${homeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
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
    [unitSystem, homeId, getAuthHeaders, notify, t]
  );

  const requestPairingCode = useCallback(async () => {
    if (!homeId) throw new Error('Create a home before requesting a pairing code.');
    const response = await fetch(`${WILLO_API_URL}/homes/${homeId}/pairing-code`, {
      method: 'POST',
      headers: getAuthHeaders(),
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
  }, [homeId, getAuthHeaders]);

  const claimDevice = useCallback(
    async (claimCode: string) => {
      if (!homeId) throw new Error('Create a home before claiming a device.');
      const response = await fetch(`${WILLO_API_URL}/homes/${homeId}/claim-device`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ claimCode }),
      });
      if (!response.ok) throw new ClaimDeviceError(response.status === 404 ? 'invalid-code' : 'failed');
      // Same reasoning as `requestPairingCode` above — the device now has a
      // fresh secret waiting for it; a stale local `paired` read must not
      // race ahead of the tunnel's own real `onPaired`/`onConnectionChange`.
      pairedRef.current = false;
    },
    [homeId, getAuthHeaders]
  );

  const fetchEvents = useCallback(async (): Promise<HomeActivityEvent[]> => {
    if (!homeId) return [];
    const response = await fetch(`${WILLO_API_URL}/homes/${homeId}/events`, {
      headers: getAuthHeaders(),
    });
    if (!response.ok) throw new Error('Could not load activity.');
    return (await response.json()) as HomeActivityEvent[];
  }, [homeId, getAuthHeaders]);

  const sendCommand = useCallback((id: string, command: DeviceCommand) => providerRef.current?.sendCommand(id, command), []);

  const value = useMemo(
    () => ({ state, dispatch, sheet, setSheet, toast, notify, devices, setupStage, tunnelConnected, homeName, demoMode, setDemoMode, unitSystem, setUnitSystem, homes, homeId, switchHome, startNewHome, createHome, requestPairingCode, pairingCode, claimDevice, fetchEvents, sendCommand, getAuthHeaders }),
    [state, sheet, toast, notify, devices, setupStage, tunnelConnected, homeName, demoMode, setDemoMode, unitSystem, setUnitSystem, homes, homeId, switchHome, startNewHome, createHome, requestPairingCode, pairingCode, claimDevice, fetchEvents, sendCommand, getAuthHeaders]
  );
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}
