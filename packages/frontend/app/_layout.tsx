import '../global.css';

import { Slot, Stack, usePathname } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { OxyProvider } from '@oxy.so/services';
import { HomeProvider } from '../state/home-context';
import { Overlays } from '../components/overlays';
import { NavigationRail } from '../components/navigation-rail';
import { BottomNav } from '../components/bottom-nav';
import { modernScreens, noTabScreens } from '../data/screens';
import { screenForPathname } from '../data/screen-routes';
import { useScreenNavigate } from '../screens/RoutedScreen';
import { ResponsiveProvider, useResponsiveLayout } from '../layout/responsive-context';
import * as WebBrowser from 'expo-web-browser';

// Complete Home Assistant's existing web OAuth popup flow.
WebBrowser.maybeCompleteAuthSession();

/**
 * The nav rail and bottom nav live HERE, outside the routed `<Slot/>`/
 * `<Stack/>`, so they mount ONCE for the life of the app instead of
 * remounting on every navigation the way they would inside a per-route
 * component — the same reason Bloom's `TabBar` highlight can spring smoothly
 * between tabs instead of popping to the new one, and the same shape as
 * OxyHQ/Mention's `_layout.tsx` (`SideBar`/`BottomBarHost` outside `<Slot/>`).
 * Only the CONTENT (header + `ContentPanel` + a screen's own body, in
 * `screen-surface.tsx`) is per-route and remounts, matching Mention's own
 * header too.
 */
function AppShell() {
  const pathname = usePathname();
  const screen = screenForPathname(pathname);
  const onNavigate = useScreenNavigate(screen);
  const insets = useSafeAreaInsets();
  const { compact } = useResponsiveLayout();
  const modern = modernScreens.includes(screen);
  const hasTabs = !noTabScreens.includes(screen);

  return (
    <View className="min-h-0 min-w-0 flex-1 bg-background" style={{ paddingLeft: insets.left, paddingRight: insets.right }}>
      <View style={{ height: insets.top }} />
      <View className="min-h-0 min-w-0 flex-1 flex-row">
        {!compact && <NavigationRail screen={screen} modern={modern} onNavigate={onNavigate} />}
        <View testID="screen-surface" className={`relative min-h-0 min-w-0 flex-1 bg-background ${Platform.OS === 'web' ? '' : 'overflow-hidden'}`}>
          {/* WEB: the window/document is the real scroller (the nav rail above
              and each screen's header pin themselves with `position: sticky`
              against it — see `navigation-rail.tsx`/`screen-surface.tsx`), so
              the route must flow in document scroll. A `<Stack>`'s scene is
              viewport-clamped and would break that, exactly as in
              OxyHQ/Mention's `_layout.tsx`. NATIVE has no document-scroll
              equivalent and keeps `<Stack>`. */}
          {Platform.OS === 'web' ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />}
        </View>
      </View>
      {compact && hasTabs ? <BottomNav screen={screen} modern={modern} onNavigate={onNavigate} /> : <View style={{ height: insets.bottom }} />}
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* `seed`, not a named `colorPreset`: none of Bloom's presets matches
            Willo's own accent (`onSky` #00537f) closely, and `seed` runs the
            SAME color engine from Willo's own real brand color instead of an
            approximation — so Bloom-rendered chrome (ContentPanel, TabBar)
            matches the rest of the app instead of visibly clashing with it.
            `defaultMode="system"` matches OxyHQ/Mention's own convention
            (`app/_layout.tsx`) — Willo has no dark-mode styling of its own
            yet, so this is the same tradeoff Mention already made, not a
            new one. */}
        <BloomProvider defaultMode="system" seed="#00537f">
          <OxyProvider baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}>
            <HomeProvider>
              <StatusBar barStyle="dark-content" />
              <ResponsiveProvider>
                <AppShell />
              </ResponsiveProvider>
              <Overlays />
            </HomeProvider>
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
