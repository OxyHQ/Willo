import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import { getLayoutMetrics, type LayoutMetrics } from './metrics';

const ResponsiveContext = createContext<LayoutMetrics | null>(null);
/** Measure the host, not the monitor. Supports split view, embeds, rotation and browser resize. */
export function ResponsiveProvider({ children }: { children: React.ReactNode }) {
  const window = useWindowDimensions();
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const measure = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    if (width <= 0 || height <= 0) return;
    setSize(previous => previous && Math.abs(previous.width - width) < 0.5 && Math.abs(previous.height - height) < 0.5 ? previous : { width, height });
  }, []);
  const width = size?.width ?? window.width;
  const height = size?.height ?? window.height;
  const metrics = useMemo(() => getLayoutMetrics(width, height, window.fontScale), [width, height, window.fontScale]);
  return (
    <View testID="responsive-host" className="min-h-0 min-w-0 flex-1" onLayout={measure}>
      <ResponsiveContext.Provider value={metrics}>{children}</ResponsiveContext.Provider>
    </View>
  );
}
export function useResponsiveLayout(): LayoutMetrics {
  const value = useContext(ResponsiveContext);
  if (!value) throw new Error('Responsive UI components must be inside ScreenSurface or ResponsiveProvider.');
  return value;
}
