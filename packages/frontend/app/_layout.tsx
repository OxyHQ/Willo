import '../global.css';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';

import { Slot, Stack, usePathname } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { OverlayInertBoundary, PortalOutlet, PortalProvider } from '@oxy.so/bloom/portal';
import { AppShell } from '@oxy.so/bloom/app-shell';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { DocumentScrollRestorationBoundary } from '@oxy.so/bloom/scroll';
import { expoRouterScrollAdapter } from '@oxy.so/bloom/scroll/expo-router';
import { useTheme } from '@oxy.so/bloom/theme';
import { OxyProvider } from '@oxy.so/services/ui/client';
import { HomeProvider } from '../state/home-context';
import { TabPagerProvider } from '../state/tab-pager';
import { Overlays } from '../components/overlays';
import { NavigationRail } from '../components/navigation-rail';
import { BottomNav } from '../components/bottom-nav';
import { ScreenChrome, ScreenHeader } from '../components/screen-chrome';
import { LinearGradient } from 'expo-linear-gradient';
import { noTabScreens } from '../data/screens';
import { screenForPathname } from '../data/screen-routes';
import { useScreenNavigate } from '../screens/use-screen-navigate';
import { BREAKPOINTS } from '../layout/metrics';
import * as WebBrowser from 'expo-web-browser';

// Complete Home Assistant's existing web OAuth popup flow.
WebBrowser.maybeCompleteAuthSession();

const IS_WEB = Platform.OS === 'web';
/** The persistent product chrome surrounds the router and its retained tab pages. */
function WilloShell() {
  const screen = screenForPathname(usePathname());
  const onNavigate = useScreenNavigate(screen);
  const { colors } = useTheme();
  const hasTabs = !noTabScreens.includes(screen);
  const header = (
    <SafeAreaView edges={['top']}>
      <LinearGradient
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        colors={[colors.background, colors.background, 'transparent']}
        locations={[0, 0.6, 1]}
      />
      <ScreenHeader screen={screen} onNavigate={onNavigate} />
    </SafeAreaView>
  );
  return (
    <ScreenChrome screen={screen} onNavigate={onNavigate}>
      <SafeAreaView edges={['left', 'right']} className="min-h-0 min-w-0 flex-1">
        <DocumentScrollRestorationBoundary>
          <AppShell
            testID="willo-shell"
            variant="feed"
            scroll="page"
            header={null}
            navFrom={BREAKPOINTS.rail}
            framedFrom={BREAKPOINTS.rail}
            gutter={8}
            frameInset={{ top: 0, start: 0, end: 8, bottom: 8 }}
            navigationAlign="content"
            navigationGap={0}
            contentMaxWidth="none"
            sidebar={{
              variant: 'rail',
              surface: 'plain',
              railWidth: 80,
              render: ({ railWidth }) => (
                <NavigationRail screen={screen} onNavigate={onNavigate} width={railWidth} />
              ),
            }}
            bottomBar={hasTabs ? <BottomNav screen={screen} /> : undefined}
            reserveBottomBarSpace={IS_WEB}
            panelLayout={{
              flow: 'document',
              headerPlacement: 'scroll-under',
              headerSpan: 'frame',
              header,
              panels: [
                {
                  id: 'main',
                  surfaceClassName: 'bg-card',
                  content: IS_WEB ? <Slot /> : <Stack screenOptions={{ headerShown: false }} />,
                },
              ],
            }}
          />
        </DocumentScrollRestorationBoundary>
      </SafeAreaView>
    </ScreenChrome>
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
        <BloomProvider
          scrollAdapter={expoRouterScrollAdapter}
          defaultMode="system"
          seed="#00537f"
          secondaryColor="#625007"
          tertiaryColor="#8e3205"
        >
          <OxyProvider
            baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}
            clientId={process.env.EXPO_PUBLIC_OXY_CLIENT_ID}
            authRedirectUri={process.env.EXPO_PUBLIC_OXY_AUTH_REDIRECT_URI}
            language={{
              supportedLocales: SUPPORTED_LANGUAGES,
              fallbackLocale: DEFAULT_LANGUAGE,
              onChange: async (locale) => {
                await i18n.changeLanguage(locale);
              },
              onError: (error, locale) =>
                console.error(`Failed to switch Willo's language to ${locale}:`, error),
            }}
          >
            <HomeProvider>
              <TabPagerProvider>
                {/* Native `Portal`s (the Ask Alia sheet, Bloom dialogs) only
                    render into the ONE outlet below, painted after the content
                    it covers. The boundary wraps everything but the outlet so a
                    modal surface hides the app from screen readers. */}
                <PortalProvider>
                  <OverlayInertBoundary>
                    <WilloShell />
                    <Overlays />
                  </OverlayInertBoundary>
                  <PortalOutlet />
                </PortalProvider>
              </TabPagerProvider>
            </HomeProvider>
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
