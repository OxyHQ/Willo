import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth, useOxy } from '@oxy.so/services';
import { homeReducer, initialHomeState, type HomeAction, type HomeState, type DeviceKey } from './home-reducer';
import * as storage from '../storage';
import { createWilloTunnelProvider } from '../providers/willo-tunnel';
import type { Device, DeviceCommand, HomeActivityEvent, SmartHomeProvider } from '../providers/types';

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
  createHome: (name?: string) => Promise<void>;
  requestPairingCode: () => Promise<{ code: string; expiresAt: string }>;
  /** This Home's real activity history (motion/door/safety sensor transitions), most recent first. Fetched fresh on every call — screens call this from their own mount effect rather than this context polling on their behalf. */
  fetchEvents: () => Promise<HomeActivityEvent[]>;
  sendCommand: (id: string, command: DeviceCommand) => void;
  /** `{ Authorization: 'Bearer …' }`, or `{}` if no session token is available yet — for the rare direct fetch/`<Image>` load (camera snapshots) that needs to authenticate itself outside the provider. */
  getAuthHeaders: () => Record<string, string>;
};

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

  const { oxyServices } = useOxy();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const getAccessToken = useCallback(() => oxyServices.getAccessToken(), [oxyServices]);

  const [devices, setDevices] = useState<Device[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [rawHomeName, setRawHomeName] = useState<string | null>(null);
  const homeName = rawHomeName ?? 'My Home';
  const [setupStage, setSetupStage] = useState<HomeSetupStage>('resolving');
  const [tunnelConnected, setTunnelConnected] = useState(false);
  const providerRef = useRef<SmartHomeProvider | null>(null);
  const hasInitialized = useRef(false);
  // Written by `onPaired` before `onConnectionChange` ever reads it (see
  // `willo-tunnel.ts`'s `connect()` — both fire synchronously off the same
  // initial fetch, in that order) — a ref, not state, so the FIRST
  // `onConnectionChange` call in that same synchronous sequence never reads
  // a stale pre-render value the way `paired` state would.
  const pairedRef = useRef(false);
  const [demoMode, setDemoModeState] = useState(false);

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

  const connectHome = useCallback(
    async (id: string) => {
      try {
        const provider = createWilloTunnelProvider({
          apiBaseUrl: WILLO_API_URL ?? '',
          homeId: id,
          getAccessToken,
          onConnectionChange: (connected) => {
            setTunnelConnected(connected);
            setSetupStage(pairedRef.current || connected ? 'ready' : 'needs-pairing');
          },
          onHomeName: setRawHomeName,
          onPaired: (paired) => {
            pairedRef.current = paired;
          },
        });
        const initialDevices = await provider.connect();
        providerRef.current = provider;
        setDevices(initialDevices);
        provider.subscribe(setDevices);
      } catch (error) {
        console.error('Failed to connect to Willo:', error);
        notify('Could not reach Willo. Check your connection and try again.');
        setSetupStage('needs-pairing');
      }
    },
    [getAccessToken, notify]
  );

  useEffect(() => {
    // Waits on Oxy auth to resolve before doing anything, and — like the
    // Effects-run-twice-in-StrictMode guard this replaces — only ever runs
    // its real body once.
    if (hasInitialized.current || !isAuthResolved) return;
    hasInitialized.current = true;

    (async () => {
      const storedHomeId = isAuthenticated ? await storage.getItemAsync('homeId') : null;
      if (!storedHomeId) {
        setSetupStage('needs-home');
        return;
      }
      setHomeId(storedHomeId);
      await connectHome(storedHomeId);
    })();
  }, [isAuthResolved, isAuthenticated, connectHome]);

  const createHome = useCallback(
    async (name?: string) => {
      const response = await fetch(`${WILLO_API_URL}/homes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) },
        body: JSON.stringify(name ? { name } : {}),
      });
      if (!response.ok) throw new Error('Could not create your home.');
      const { home } = (await response.json()) as { home: { id: string; name: string | null } };
      await storage.setItemAsync('homeId', home.id);
      setHomeId(home.id);
      setRawHomeName(home.name);
      await connectHome(home.id);
    },
    [getAccessToken, connectHome]
  );

  const requestPairingCode = useCallback(async () => {
    if (!homeId) throw new Error('Create a home before requesting a pairing code.');
    const token = getAccessToken();
    const response = await fetch(`${WILLO_API_URL}/homes/${homeId}/pairing-code`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Could not generate a pairing code.');
    // Issuing a code nulls any existing secret server-side (`issuePairingCode`) —
    // reflect that immediately rather than waiting for a future reconnect's
    // `onPaired` to catch up, so a mid-session re-pair (an owner replacing
    // their Home Assistant Green) can't race a stale `true` here.
    pairedRef.current = false;
    return (await response.json()) as { code: string; expiresAt: string };
  }, [homeId, getAccessToken]);

  const fetchEvents = useCallback(async (): Promise<HomeActivityEvent[]> => {
    if (!homeId) return [];
    const token = getAccessToken();
    const response = await fetch(`${WILLO_API_URL}/homes/${homeId}/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('Could not load activity.');
    return (await response.json()) as HomeActivityEvent[];
  }, [homeId, getAccessToken]);

  const sendCommand = useCallback((id: string, command: DeviceCommand) => providerRef.current?.sendCommand(id, command), []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const value = useMemo(
    () => ({ state, dispatch, sheet, setSheet, toast, notify, devices, setupStage, tunnelConnected, homeName, demoMode, setDemoMode, createHome, requestPairingCode, fetchEvents, sendCommand, getAuthHeaders }),
    [state, sheet, toast, notify, devices, setupStage, tunnelConnected, homeName, demoMode, setDemoMode, createHome, requestPairingCode, fetchEvents, sendCommand, getAuthHeaders]
  );
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}
