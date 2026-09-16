import React, { useCallback, useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { Slot } from 'expo-router';
import { useTabsWithTriggers } from 'expo-router/ui';
import { TabsPager } from '../../components/tabs-pager';
import { routeNameForTab, tabs } from '../../components/navigation-items';
import { SCREEN_ROUTES } from '../../data/screen-routes';
import { useTabPager } from '../../state/tab-pager';

const IS_WEB = Platform.OS === 'web';

/**
 * The five destinations of the bottom bar, as one navigator.
 *
 * A GROUP, NOT A DIRECTORY: `(tabs)` adds no path segment, so `/`, `/devices`,
 * `/activity`, `/automations` and `/settings` are exactly the URLs they were —
 * every link, the rail's route table and `screenForPathname` keep working.
 *
 * WHAT IT BUYS: these five used to be ordinary siblings of every other route,
 * so switching tab MOUNTED a screen from scratch — no scroll kept, no state
 * kept, and the JS thread blocked while the incoming screen rendered. Here they
 * are alive side by side and the pager moves between them, which is also what
 * makes a real swipe between tabs possible.
 *
 * WEB RENDERS A PLAIN `<Slot/>` and that is not a stopgap: the web shell is a
 * document-scroll model, which pages sitting side by side cannot coexist with.
 * The branch is a module-scope constant, so it can never change at runtime —
 * a `<Slot/>` appearing at two tree positions is its own class of bug.
 */
export default function TabsLayout() {
  if (IS_WEB) return <Slot />;
  return <NativeTabsLayout />;
}

function NativeTabsLayout() {
  const { progress, selectTab, registerCommitter } = useTabPager();

  const triggers = useMemo(
    () => tabs.map(tab => ({ type: 'internal' as const, name: routeNameForTab(tab.screen), href: SCREEN_ROUTES[tab.screen] })),
    [],
  );
  const { state, descriptors, navigation, NavigationContent } = useTabsWithTriggers({
    triggers,
    // Back retraces the tabs actually visited rather than always returning to
    // home — what every tabbed app the reader already uses does.
    backBehavior: 'history',
  });

  /**
   * `navigation.navigate(name)` is the tab router's own move, so it neither
   * stacks a history entry per swipe nor unmounts the tab being left. A
   * `router.navigate(href)` would reach the same screen and lose both.
   */
  const commit = useCallback((pageIndex: number) => {
    const tab = tabs[pageIndex];
    if (tab) navigation.navigate(routeNameForTab(tab.screen));
  }, [navigation]);

  // Registering with the provider above is synchronising with something
  // outside React — the bar renders over routes this navigator does not own,
  // so it cannot reach `navigation` any other way — and it has a real
  // unregister to run when this layout goes away.
  useEffect(() => {
    registerCommitter(commit);
    return () => registerCommitter(null);
  }, [commit, registerCommitter]);

  return (
    <NavigationContent>
      <TabsPager state={state} descriptors={descriptors} progress={progress} onCommit={selectTab} />
    </NavigationContent>
  );
}
