import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import { useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { tabs } from '../components/navigation-items';
import { SCREEN_ROUTES } from '../data/screen-routes';

/**
 * How the tabs navigator switches page, handed up once it has mounted: through
 * its own API, so no history entry is pushed and the page being left stays
 * mounted.
 *
 * This provider sits ABOVE the navigator because the bottom bar does too — the
 * bar draws over `/favorites`, `/timeline` and `/routines`, which are not tab
 * routes — and because on web there is no navigator at all.
 */
type CommitTab = (pageIndex: number) => void;

type TabPagerValue = {
  /**
   * Where the bottom bar's highlight IS, in tab units, on the UI thread —
   * fractional mid-swipe. Handed to Bloom's `activeProgress` so the pill
   * follows the finger instead of jumping once the page lands.
   */
  progress: SharedValue<number>;
  /** Tap or swipe, one path: the navigator's move when it is mounted, a plain navigation when it isn't (web). */
  selectTab: (index: number) => void;
  registerCommitter: (commit: CommitTab | null) => void;
};

const TabPagerContext = createContext<TabPagerValue | null>(null);

/** How the highlight settles when a tap moves it, rather than a finger. */
const SETTLE_SPRING = { damping: 20, stiffness: 180, mass: 0.6 };

export function TabPagerProvider({ children }: { children: React.ReactNode }) {
  const progress = useSharedValue(0);
  const committer = useRef<CommitTab | null>(null);
  const router = useRouter();

  const registerCommitter = useCallback((next: CommitTab | null) => {
    committer.current = next;
  }, []);

  const selectTab = useCallback((index: number) => {
    const tab = tabs[index];
    if (!tab) return;
    // The pager writes `progress` itself while a finger is on it; a TAP has no
    // finger to follow, so the highlight is sprung there instead.
    progress.value = withSpring(index, SETTLE_SPRING);
    if (committer.current) committer.current(index);
    else router.navigate(SCREEN_ROUTES[tab.screen]);
  }, [progress, router]);

  const value = useMemo(() => ({ progress, selectTab, registerCommitter }), [progress, selectTab, registerCommitter]);
  return <TabPagerContext.Provider value={value}>{children}</TabPagerContext.Provider>;
}

export function useTabPager(): TabPagerValue {
  const value = useContext(TabPagerContext);
  if (!value) throw new Error('Wrap the UI in <TabPagerProvider>.');
  return value;
}
