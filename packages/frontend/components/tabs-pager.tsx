import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView, { type PagerViewOnPageSelectedEvent } from 'react-native-pager-view';
import Animated, { useEvent, useHandler, type SharedValue } from 'react-native-reanimated';
import { Screen } from 'react-native-screens';
import { routeNameForTab, tabs } from './navigation-items';

const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

type PageScrollEvent = { position: number; offset: number };
type PagerScrollProp = React.ComponentProps<typeof PagerView>['onPageScroll'];

/**
 * `onPageScroll`, on the UI thread.
 *
 * `PagerView` emits it as a native direct event; Reanimated's `useEvent`
 * subscribes by name and runs the worklet in the UI runtime, so the bar's
 * highlight follows the finger with no bridge hop and no JS frame in between.
 * A plain JS callback here would put a bridge crossing on every frame of every
 * swipe — the exact cost this pager exists to avoid.
 */
function usePageScrollHandler(handler: (event: PageScrollEvent) => void, deps: unknown[]): PagerScrollProp {
  const { doDependenciesDiffer } = useHandler({ onPageScroll: handler }, deps);
  const processed = useEvent<PageScrollEvent>(event => {
    'worklet';
    handler(event);
  }, ['onPageScroll'], doDependenciesDiffer);
  // Reanimated hands back an `EventHandlerProcessed`, which is what gets
  // attached to the native view; `PagerView` types the prop as the codegen
  // `DirectEventHandler` React would have given it. The two describe the same
  // attachment from opposite ends, and TypeScript cannot see that — so the
  // seam is this one line rather than a looser prop or handler type.
  return processed as unknown as PagerScrollProp;
}

/** What the tabs navigator hands over: one route per tab, and how to render each. */
type PagerRoute = { key: string; name: string };
type PagerDescriptors = Record<string, { render: () => React.ReactNode }>;

/**
 * The five tabs, side by side, swipeable.
 *
 * Every tab stays MOUNTED: switching used to remount a screen from nothing, so
 * it lost its scroll position and its state and the reader waited on a fresh
 * render. Here the pager just moves between pages that are already there.
 *
 * `progress` is written every frame while a finger is on the pager, and handed
 * to Bloom's `TabBar` as `activeProgress`, so the highlight tracks the swipe
 * rather than jumping once the page lands.
 */
export function TabsPager({ state, descriptors, progress, onCommit }: {
  state: { index: number; routes: PagerRoute[] };
  descriptors: PagerDescriptors;
  progress: SharedValue<number>;
  onCommit: (pageIndex: number) => void;
}) {
  const pager = useRef<PagerView>(null);
  const routeByName = useMemo(() => new Map(state.routes.map(route => [route.name, route])), [state.routes]);
  const focusedPage = Math.max(0, tabs.findIndex(tab => routeByName.get(routeNameForTab(tab.screen))?.key === state.routes[state.index]?.key));
  // Which pages have ever been shown. A page is only built once the reader has
  // actually been there or is one swipe away from it, so the first paint is
  // one screen rather than five.
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([focusedPage]));
  const admit = useCallback((pages: number[]) => {
    setLoaded(previous => {
      if (pages.every(page => previous.has(page))) return previous;
      const next = new Set(previous);
      pages.forEach(page => next.add(page));
      return next;
    });
  }, []);
  // The page the pager is currently on, tracked outside React so a scroll
  // event doesn't have to wait for a render to know whether it moved.
  const currentPage = useRef(focusedPage);

  const onPageScroll = usePageScrollHandler(event => {
    'worklet';
    progress.value = event.position + event.offset;
  }, [progress]);

  const onPageSelected = useCallback((event: PagerViewOnPageSelectedEvent) => {
    const next = event.nativeEvent.position;
    if (next === currentPage.current) return;
    currentPage.current = next;
    admit([next, next - 1, next + 1].filter(page => page >= 0 && page < tabs.length));
    onCommit(next);
  }, [admit, onCommit]);

  // A tap on the bar moves the route, and the pager follows it here rather
  // than the other way round, so tap and swipe end in the same place.
  if (focusedPage !== currentPage.current) {
    currentPage.current = focusedPage;
    pager.current?.setPage(focusedPage);
  }

  return (
    <AnimatedPagerView ref={pager} style={styles.pager} initialPage={focusedPage}
      // One page either side is exactly what `admit` keeps built; more would
      // ask the platform to hold screens alive with nothing to show.
      offscreenPageLimit={1}
      // No rubber band at the ends: an overdrag off the first or last tab is a
      // horizontal gesture the pager eats and then does nothing with.
      overdrag={false}
      onPageScroll={onPageScroll} onPageSelected={onPageSelected}>
      {tabs.map((tab, index) => {
        const route = routeByName.get(routeNameForTab(tab.screen));
        const descriptor = route ? descriptors[route.key] : undefined;
        return (
          // `collapsable={false}`: a page whose content is still null would be
          // dropped from the native hierarchy and take its position with it.
          <View key={tab.screen} collapsable={false} style={styles.page}>
            {descriptor && loaded.has(index) ? (
              // 2 drives the focused page, 1 keeps its neighbours laid out and
              // painted so they are real under the finger, 0 parks the rest.
              <Screen enabled activityState={index === focusedPage ? 2 : Math.abs(index - focusedPage) <= 1 ? 1 : 0} style={styles.screen}>
                {descriptor.render()}
              </Screen>
            ) : null}
          </View>
        );
      })}
    </AnimatedPagerView>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
  page: { flex: 1 },
  screen: { flex: 1 },
});
