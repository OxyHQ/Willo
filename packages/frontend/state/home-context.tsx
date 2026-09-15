import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { useAuth, useOxy } from '@oxy.so/services';
import { homeReducer, initialHomeState, type HomeAction, type HomeState, type DeviceKey } from './home-reducer';
import * as storage from '../storage';
import { createWilloTunnelProvider } from '../providers/willo-tunnel';
import type { Device, DeviceCommand, SmartHomeProvider } from '../providers/types';

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
 *  - `needs-pairing`: a Home exists, but its tunnel has never connected —
 *    the "enter this code in your Home Assistant" screen.
 *  - `ready`: the tunnel is connected; the real app renders.
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
  createHome: (name?: string) => Promise<void>;
  requestPairingCode: () => Promise<{ code: string; expiresAt: string }>;
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
  const [setupStage, setSetupStage] = useState<HomeSetupStage>('resolving');
  const providerRef = useRef<SmartHomeProvider | null>(null);
  const hasInitialized = useRef(false);

  const connectHome = useCallback(
    async (id: string) => {
      try {
        const provider = createWilloTunnelProvider({
          apiBaseUrl: WILLO_API_URL ?? '',
          homeId: id,
          getAccessToken,
          onConnectionChange: (connected) => setSetupStage(connected ? 'ready' : 'needs-pairing'),
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
      const { home } = (await response.json()) as { home: { id: string } };
      await storage.setItemAsync('homeId', home.id);
      setHomeId(home.id);
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
    return (await response.json()) as { code: string; expiresAt: string };
  }, [homeId, getAccessToken]);

  const sendCommand = useCallback((id: string, command: DeviceCommand) => providerRef.current?.sendCommand(id, command), []);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const value = useMemo(
    () => ({ state, dispatch, sheet, setSheet, toast, notify, devices, setupStage, createHome, requestPairingCode, sendCommand, getAuthHeaders }),
    [state, sheet, toast, notify, devices, setupStage, createHome, requestPairingCode, sendCommand, getAuthHeaders]
  );
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}
