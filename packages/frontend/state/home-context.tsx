import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { homeReducer, initialHomeState, type HomeAction, type HomeState, type DeviceKey } from './home-reducer';
import * as storage from '../storage';
import { createHomeAssistantProvider } from '../providers/home-assistant';
import type { Device, DeviceCommand, SmartHomeProvider } from '../providers/types';

export type SheetOption = { label: string; description?: string; selected?: boolean; onPress: () => void };
export type Sheet =
  | { kind: 'menu'; title: string; description?: string; options: SheetOption[] }
  | { kind: 'device'; title: string; id: DeviceKey }
  | { kind: 'realDevice'; title: string; device: Device }
  | { kind: 'camera'; title: string; garden?: boolean; snapshotUrl?: string | null }
  | { kind: 'message'; title: string; description: string }
  | null;

type HomeContextValue = {
  state: HomeState;
  dispatch: React.Dispatch<HomeAction>;
  sheet: Sheet;
  setSheet: React.Dispatch<React.SetStateAction<Sheet>>;
  toast: string;
  notify: (message: string) => void;
  devices: Device[];
  unauthenticated: boolean | null;
  login: (params: { instanceUrl: string }) => Promise<void>;
  sendCommand: (id: string, command: DeviceCommand) => void;
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

  const [devices, setDevices] = useState<Device[]>([]);
  const [unauthenticated, setUnauthenticated] = useState<boolean | null>(null);
  const providerRef = useRef<SmartHomeProvider | null>(null);
  const hasInitialized = useRef(false);

  const onRefreshToken = useCallback((refreshToken: string) => {
    storage.setItemAsync('refreshToken', refreshToken);
    storage.deleteItemAsync('authCode');
  }, []);

  const connectWith = useCallback(
    async (credentials: { instanceUrl: string; authCode?: string | null; refreshToken?: string | null; clientId: string }) => {
      try {
        const provider = createHomeAssistantProvider({ ...credentials, onRefreshToken });
        const initialDevices = await provider.connect();
        providerRef.current = provider;
        setDevices(initialDevices);
        provider.subscribe(setDevices);
        setUnauthenticated(false);
      } catch (error) {
        console.error('Failed to connect to Home Assistant', error);
        setUnauthenticated(true);
        notify('Could not connect to Home Assistant. Check the instance URL and try again.');
      }
    },
    [onRefreshToken, notify]
  );

  const login = useCallback(
    async ({ instanceUrl }: { instanceUrl: string }) => {
      const authCode = await storage.getItemAsync('authCode');
      const clientId = await storage.getItemAsync('clientId');
      if (!clientId) return;
      await connectWith({ instanceUrl, authCode, clientId });
    },
    [connectWith]
  );

  useEffect(() => {
    // Prevents a duplicate Home Assistant connection from Effects running
    // twice in StrictMode.
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    (async () => {
      const refreshToken = await storage.getItemAsync('refreshToken');
      const instanceUrl = await storage.getItemAsync('instanceUrl');
      const clientId = await storage.getItemAsync('clientId');
      if (!refreshToken || !instanceUrl || !clientId) {
        setUnauthenticated(true);
        return;
      }
      await connectWith({ instanceUrl, refreshToken, clientId });
    })();
  }, [connectWith]);

  const sendCommand = useCallback((id: string, command: DeviceCommand) => providerRef.current?.sendCommand(id, command), []);

  const value = useMemo(
    () => ({ state, dispatch, sheet, setSheet, toast, notify, devices, unauthenticated, login, sendCommand }),
    [state, sheet, toast, notify, devices, unauthenticated, login, sendCommand]
  );
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}

export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}
