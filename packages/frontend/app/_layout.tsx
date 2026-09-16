import '../global.css';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';

import { Slot, Stack, usePathname } from 'expo-router';
import { Platform, StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { useTheme } from '@oxy.so/bloom/theme';
import { OxyProvider } from '@oxy.so/services';
import { HomeProvider } from '../state/home-context';
import { Overlays } from '../components/overlays';
import { NavigationRail } from '../components/navigation-rail';
import { BottomNav } from '../components/bottom-nav';
import { noTabScreens } from '../data/screens';
import { screenForPathname } from '../data/screen-routes';
import { useScreenNavigate } from '../screens/use-screen-navigate';
import { useResponsiveLayout } from '../layout/use-responsive-layout';
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
 *
 * Being signed out of Oxy is handled INSIDE `ScreenSurface` (swapping in
 * `SignInPrompt` for a screen's normal content, inside the same
 * `ContentPanel` every screen already gets there) — not up here. Gating at
 * this level would intercept before any route (and its `ContentPanel`)
 * ever mounts, which is exactly what left the sign-in screen sitting on the
 * plain page background instead of the same card surface every other
 * screen has.
 */
function AppShell() {
  const pathname = usePathname();
  const screen = screenForPathname(pathname);
  const onNavigate = useScreenNavigate(screen);
  const insets = useSafeAreaInsets();
  const { compact } = useResponsiveLayout();
  const { isDark } = useTheme();
  const hasTabs = !noTabScreens.includes(screen);

  // The shell holds NO vertical safe-area space of its own: the app draws
  // edge to edge, so a screen's content scrolls up behind the status bar and
  // down behind the gesture bar rather than stopping at a blank strip, the
  // same as Mention. Whoever sits AT an edge owns that edge's inset instead —
  // the header and the panel's content in `screen-surface.tsx` for the top and
  // bottom, `BottomNav` for its own bar. Left/right stay here: they are 0 in
  // portrait and, in landscape, apply to every screen alike.
  return (
    <View className="min-h-0 min-w-0 flex-1 bg-background" style={{ paddingLeft: insets.left, paddingRight: insets.right }}>
      {/* Now that content sits behind the status bar, the clock and icons have
          to read against whatever is under them — dark glyphs on Willo's light
          shell, light ones in dark mode. */}
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />
      <View className="min-h-0 min-w-0 flex-1 flex-row">
        {!compact && <NavigationRail screen={screen} onNavigate={onNavigate} />}
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
      {compact && hasTabs && <BottomNav screen={screen} onNavigate={onNavigate} />}
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
            new one. `tertiaryColor`: Bloom's `secondary`/`tertiary` are
            otherwise auto-DERIVED from the seed via M3 color theory and can
            land on any hue (for this seed, an unpinned `tertiary` resolves to
            a brown, not the warm peach the climate card needs) — pinning it
            to Willo's own `onPeach` keeps that family a real peach at every
            mode instead of an arbitrary derived color. Same reasoning for
            `secondaryColor` → `onYellow`: an unpinned `secondary` resolves to
            a red for this seed, not the yellow the "light is on" tone needs. */}
        <BloomProvider defaultMode="system" seed="#00537f" secondaryColor="#625007" tertiaryColor="#8e3205">
          <OxyProvider
            baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}
            clientId={process.env.EXPO_PUBLIC_OXY_CLIENT_ID}
            authRedirectUri={process.env.EXPO_PUBLIC_OXY_AUTH_REDIRECT_URI}
            language={{
              supportedLocales: SUPPORTED_LANGUAGES,
              fallbackLocale: DEFAULT_LANGUAGE,
              onChange: async locale => { await i18n.changeLanguage(locale); },
              onError: (error, locale) => console.error(`Failed to switch Willo's language to ${locale}:`, error),
            }}
          >
            <HomeProvider>
              <AppShell />
              <Overlays />
            </HomeProvider>
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
