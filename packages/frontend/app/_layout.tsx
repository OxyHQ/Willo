import { useMemo, useState } from 'react';
import '../global.css';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';

import { Slot, Stack, usePathname } from 'expo-router';
import { Platform, StatusBar, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { useTheme } from '@oxy.so/bloom/theme';
import { OxyProvider } from '@oxy.so/services';
import { HomeProvider } from '../state/home-context';
import { TabPagerProvider } from '../state/tab-pager';
import { Overlays } from '../components/overlays';
import { NavigationRail } from '../components/navigation-rail';
import { BottomNav } from '../components/bottom-nav';
import { ScreenChrome, ScreenHeader } from '../components/screen-chrome';
import { ShellHeaderProvider } from '../layout/page-layout';
import { LinearGradient } from 'expo-linear-gradient';
import { asViewStyle } from '../layout/web-style';
import { noTabScreens } from '../data/screens';
import { screenForPathname } from '../data/screen-routes';
import { useScreenNavigate } from '../screens/use-screen-navigate';
import { useResponsiveLayout } from '../layout/use-responsive-layout';
import * as WebBrowser from 'expo-web-browser';

// Complete Home Assistant's existing web OAuth popup flow.
WebBrowser.maybeCompleteAuthSession();

const IS_WEB = Platform.OS === 'web';
/**
 * How the one header stays at the top of the screen, which is the one thing
 * the two platforms genuinely cannot share — they scroll differently.
 *
 * WEB scrolls the document (see `global.css`), so the header is `sticky`: it
 * keeps its own space in the flow and pins there as the page moves under it.
 * NATIVE has a viewport-clamped scene whose ScrollView owns the scroll, where
 * `sticky` does not exist, so the header is an `absolute` overlay at the top
 * of the panel and the scroll reserves its height instead.
 *
 * This is the same split, for the same reason, that OxyHQ/Mention makes in
 * `components/shell/PanelChrome.tsx`.
 */
const headerStyle = IS_WEB
  ? asViewStyle({ position: 'sticky', top: 0, zIndex: 100 })
  : ({ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100 } as const);

/**
 * The header, the nav rail and the bottom bar live HERE, outside the routed
 * `<Slot/>`/`<Stack/>`, so they mount ONCE for the life of the app instead of
 * remounting on every navigation. For the bar that is what lets Bloom's
 * highlight spring between tabs instead of popping; for the HEADER it is what
 * stops a swipe between tabs carrying a second copy of the same chrome across
 * the screen with it. Only a screen's own body is per-route.
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
  const { colors, isDark } = useTheme();
  const hasTabs = !noTabScreens.includes(screen);

  // The one header the app has. Its height is measured here and published to
  // the screens below, because where it sits changes what they owe it: above
  // `shell:` it is a real sibling and takes its own space, below it is pinned
  // over the panel and the screen reserves its height instead.
  const [headerHeight, setHeaderHeight] = useState(0);
  // A sticky header keeps its own space; an absolute one does not — so this is
  // the only case where a screen has to reserve the header's height itself.
  const headerOverlaysContent = !IS_WEB;
  const shellHeader = useMemo(
    () => ({ height: headerHeight, overlaysContent: headerOverlaysContent }),
    [headerHeight, headerOverlaysContent],
  );
  const header = (
    <View style={{ paddingTop: insets.top }} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
      <ScreenHeader screen={screen} onNavigate={onNavigate}/>
    </View>
  );

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
        <ScreenChrome screen={screen} onNavigate={onNavigate}>
          <View testID="screen-surface" className="relative min-h-0 min-w-0 flex-1">
            {/* FIRST, always. `sticky` pins a box from where it already is,
                so as the last child the web header only appeared once you had
                scrolled to the bottom of the page — that is why it was missing
                on mobile web. `absolute` ignores the flow, so on native the
                position in the tree only decides paint order, which `zIndex`
                settles anyway. */}
            <View pointerEvents="box-none" style={headerStyle}>
              {/* The header's background, on both platforms: solid at the top
                  and transparent by the bottom, so content passing underneath
                  dissolves into it rather than being cut off at a line. It is
                  a real gradient rather than a CSS one because
                  `backgroundImage` is web-only — with that, Android had no
                  header background at all. */}
              <LinearGradient pointerEvents="none" style={StyleSheet.absoluteFill} colors={[colors.background, colors.background, 'transparent']} locations={[0, 0.6, 1]}/>
              {header}
            </View>
            <View className="relative min-h-0 min-w-0 flex-1">
              <ShellHeaderProvider value={shellHeader}>
                {/* WEB: the window/document is the real scroller (the nav rail
                    and this header pin themselves with `position: sticky`
                    against it), so the route must flow in document scroll — a
                    `<Stack>`'s scene is viewport-clamped and would break that,
                    exactly as in OxyHQ/Mention's `_layout.tsx`. NATIVE has no
                    document-scroll equivalent and keeps `<Stack>`. */}
                {IS_WEB ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />}
              </ShellHeaderProvider>
            </View>
          </View>
        </ScreenChrome>
      </View>
      {compact && hasTabs && <BottomNav screen={screen} />}
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
              <TabPagerProvider>
                <AppShell />
                <Overlays />
              </TabPagerProvider>
            </HomeProvider>
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
