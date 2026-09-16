import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import { getLayoutMetrics, type LayoutMetrics } from './metrics';

/**
 * The layout every responsive component reads: columns, gutter, compact.
 *
 * A plain hook, not a provider. It used to be a context fed by a full-bleed
 * host `View` with its own `onLayout` and state, which measured exactly what
 * `useWindowDimensions` already reports — the app fills the window on both web
 * and native — while costing a view in the tree and a re-render per layout
 * pass. Every consumer computes the same memoised object from the same window
 * size, so there is nothing for a context to share.
 */
export function useResponsiveLayout(): LayoutMetrics {
  const { width, height, fontScale } = useWindowDimensions();
  return useMemo(() => getLayoutMetrics(width, height, fontScale), [width, height, fontScale]);
}
