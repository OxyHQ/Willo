import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { homeReducer, initialHomeState, type HomeAction, type HomeState, type DeviceKey } from './home-reducer';
export type SheetOption = { label: string; description?: string; selected?: boolean; onPress: () => void };
export type Sheet =
  | { kind: 'menu'; title: string; description?: string; options: SheetOption[] }
  | { kind: 'device'; title: string; id: DeviceKey }
  | { kind: 'camera'; title: string; garden?: boolean }
  | { kind: 'message'; title: string; description: string }
  | null;
type HomeContextValue = { state: HomeState; dispatch: React.Dispatch<HomeAction>; sheet: Sheet; setSheet: React.Dispatch<React.SetStateAction<Sheet>>; toast: string; notify: (message: string) => void };
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
  const value = useMemo(() => ({ state, dispatch, sheet, setSheet, toast, notify }), [state, sheet, toast, notify]);
  return <HomeContext.Provider value={value}>{children}</HomeContext.Provider>;
}
export function useHome(): HomeContextValue {
  const value = useContext(HomeContext);
  if (!value) throw new Error('Wrap the UI in <HomeProvider>.');
  return value;
}
