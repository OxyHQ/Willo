import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@oxy.so/services';
import { SignInPrompt } from './sign-in-prompt';
import { useHome } from '../state/home-context';
import { type ScreenId } from '../data/screens';
import { BREAKPOINTS } from '../layout/metrics';
import { ContentPanel } from '@oxy.so/bloom/content-panel';
import { useShellHeader } from '../layout/page-layout';
import { useBottomEdgeInset } from '@oxy.so/bloom/layout';
import { useTheme } from '@oxy.so/bloom/theme';

/**
 * The panel a screen's body sits in. The header, the nav rail and the bottom
 * bar are NOT here — they are the shell's (`app/_layout.tsx`), mounted once
 * outside the routed `<Slot/>`/`<Stack/>`, so they stay put across navigation
 * instead of remounting, or sliding, with every screen.
 *
 * ContentPanel is unframed (full-bleed, no visible card) below this width, and
 * it is the same width the shell's header changes sides at: a sibling above the
 * panel from here up, pinned over it below.
 *
 * This MUST be `BREAKPOINTS.rail` (not a separate literal) — it's also what
 * `compact` flips on in `app/_layout.tsx`, which swaps the nav rail for the
 * bottom nav. Three independently-implemented responsive behaviors have to
 * flip at the same width, or a band of widths shows one flipped and the
 * others not (e.g. the rail still visible while the header has already
 * jumped inside a panel that's still full-bleed). See `BREAKPOINTS`'s own
 * doc comment.
 */
const PANEL_FRAMED_FROM = BREAKPOINTS.rail;

/**
 * The frame every screen shares: the `ContentPanel` it sits in, and the
 * sign-in and setup gates in front of it. The screen itself is handed in by
 * the route that owns it.
 *
 * It deliberately knows NO screen: it used to import all fifteen and switch on
 * an id, so opening any route pulled the whole app into memory at once (and on
 * Hermes that graph overflowed the JS stack before the first paint). Routes own
 * their screen the way Mention's do.
 */
export function ScreenSurface({ screen, renderContent, renderSetupPrompt }: {
  screen: ScreenId;
  renderContent: () => React.ReactNode;
  /** Shown instead of the screen when this Home isn't set up yet. Only the screens that have something to say about setup pass one; the rest get a spinner. */
  renderSetupPrompt?: () => React.ReactNode;
}) {
  const { colors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const { setupStage, demoMode } = useHome();
  const router = useRouter();
  // Setup lives at its own `/onboarding` route (`app/onboarding.tsx`), not a
  // modal over whatever the user happened to be on — landing there straight
  // after sign-in is a normal navigation, not an interruption. `home` and
  // `settings` are the two exceptions that never redirect: home shows
  // `HomeSetupPrompt` inline instead (see that component's doc comment), and
  // settings has to stay reachable pre-setup or there would be no way to
  // reach its Demo mode toggle — the one thing a Home with nothing set up
  // yet can still turn on. Demo mode is a THIRD, broader exception: every
  // screen already knows how to render its own mock catalog without a real
  // Home (see `useHome()`'s `demoMode` doc comment), so nothing needs to
  // redirect anywhere while it's on. Once setup finishes, a Home sitting on
  // `/onboarding` itself gets sent back to `/`.
  useEffect(() => {
    if (!isAuthResolved || !isAuthenticated || setupStage === 'resolving') return;
    if (setupStage === 'ready') {
      if (screen === 'onboarding') router.replace('/');
      return;
    }
    if (demoMode) return;
    if (screen !== 'home' && screen !== 'onboarding' && screen !== 'settings') router.replace('/onboarding');
  }, [isAuthResolved, isAuthenticated, setupStage, demoMode, screen, router]);
  // The compact header floats directly over scrolling content, so a hard
  // edge would cut that content off with a visible line as it passes. A
  // gradient — solid at the top, transparent by the bottom — reads as the
  // content dissolving under the header instead.
  // `BottomNav` (web) floats `position: fixed` over content and CLAIMS its
  // own footprint in Bloom's bottom-edge registry (`bottom-nav.tsx`) — this
  // is the other half: content reads that claim back and pads itself clear
  // of it, or the last row or two sits underneath the fixed bar, unreachable
  // to a tap. Reads 0 wherever the bar isn't shown (desktop, native), so
  // this is a harmless no-op there.
  const shellHeader = useShellHeader();
  const bottomEdgeInset = useBottomEdgeInset();
  // WEB ONLY, and this is the same split Mention's own shell makes. There the
  // bar is `position: fixed` over a document that scrolls past it, so the page
  // itself has to end above it. On NATIVE the panel fills the window and the
  // bar floats over its last few rows on purpose — that is what puts scrolling
  // content behind the bar and behind the gesture line. The scroll inside it
  // holds the clearance instead, so the content stops above the bar while the
  // scroll keeps going (`PageScroll`). Adding it here as well would push the
  // panel itself up and leave a dead band under it.
  const panelBottomInset = Platform.OS === 'web' ? bottomEdgeInset : 0;
  let content: React.ReactNode = renderContent();

  // Swaps the CONTENT for the sign-in prompt while Oxy auth isn't ready —
  // the same panel still frames it, so it isn't a separately-styled screen,
  // and the shell's header and nav stay exactly where they are. Not a higher-level gate above
  // `<Slot/>`/`<Stack/>` (`app/_layout.tsx`'s own doc comment on `AppShell`
  // says why): that would intercept before this component — and its one
  // shared `ContentPanel` below — ever mounted.
  //
  // Setup-incomplete Homes are handled differently: `/onboarding` is a real
  // route now (see the redirect effect above), so this only needs to cover
  // the brief window before that redirect lands (any screen but home) and
  // the home screen's own inline prompt (which doesn't redirect at all).
  // Demo mode skips all of this — the route's own content already renders
  // correctly with no real Home.
  const spinner = <View className="min-h-0 min-w-0 flex-1 items-center justify-center"><ActivityIndicator color={colors.primary}/></View>;
  const awaitingSetup = !demoMode && setupStage !== 'ready' && setupStage !== 'resolving';
  if (!isAuthResolved) {
    content = spinner;
  } else if (!isAuthenticated) {
    content = <SignInPrompt/>;
  } else if (awaitingSetup && renderSetupPrompt) {
    content = renderSetupPrompt();
  } else if (awaitingSetup && screen !== 'onboarding' && screen !== 'settings') {
    content = spinner;
  }

  return (
    <View className="min-h-0 min-w-0 flex-1 shell:pb-2 shell:pr-2">
      {/* `overlayTopOffset`: the panel's viewport-mode overlays are positioned
          from the true viewport top, on the assumption that the panel starts
          near it. The shell's header sits above it on desktop without moving
          that maths, so without this an overlay would paint over the header. */}
      <ContentPanel framedFrom={PANEL_FRAMED_FROM} overlayTopOffset={shellHeader.overlaysContent ? 0 : shellHeader.height} maskColor={colors.background} surfaceClassName="bg-card" contentClassName="min-h-0 min-w-0 flex-1" contentStyle={{ paddingBottom: panelBottomInset }}>
        {content}
      </ContentPanel>
    </View>
  );
}
