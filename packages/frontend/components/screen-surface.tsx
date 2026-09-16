import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@oxy.so/services';
import { SignInPrompt } from './sign-in-prompt';
import { useHome } from '../state/home-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Navigate, type ScreenId } from '../data/screens';
import { BREAKPOINTS } from '../layout/metrics';
import { asViewStyle } from '../layout/web-style';
import { ContentPanel } from '@oxy.so/bloom/content-panel';
import { useBottomEdgeInset } from '@oxy.so/bloom/layout';
import { useTheme } from '@oxy.so/bloom/theme';
import { useResponsiveLayout } from '../layout/use-responsive-layout';

/**
 * A screen's own content: header + `ContentPanel` + body. The nav rail and
 * bottom nav are NOT here — they live in `app/_layout.tsx`, mounted once
 * outside the routed `<Slot/>`/`<Stack/>`, so they persist across navigation
 * instead of remounting with every screen (see that file's doc comment).
 *
 * ContentPanel is unframed (full-bleed, no visible card) below this width. Above
 * it, the header sits as its own sibling above the panel; below it, there's no
 * panel to sit above yet, so it rejoins the screen's own body — as the first
 * thing inside that screen's own scroll, exactly like Mention keeps its header
 * inside the one real scroll on small screens, not floating outside it.
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
// Sticky, not fixed: its containing block is the header+panel column below,
// which is as tall as the document (real scroll on web — see `app/_layout.tsx`
// and `global.css`), so it stays pinned at the top for the full scroll length —
// same mechanism as `NavigationRail`, and as OxyHQ/Mention's own sticky header
// (`components/Header.tsx`), just applied to a header that is this app's own
// sibling of the panel instead of the panel's first child.
const webStickyHeaderStyle = Platform.OS === 'web' ? asViewStyle({ position: 'sticky', top: 0, zIndex: 100 }) : undefined;

/**
 * The frame every screen shares — header, `ContentPanel`, and the sign-in and
 * setup gates — with the screen itself handed in by the route that owns it.
 *
 * It deliberately knows NO screen: it used to import all fifteen and switch on
 * an id, so opening any route pulled the whole app into memory at once (and on
 * Hermes that graph overflowed the JS stack before the first paint). Routes own
 * their screen the way Mention's do.
 *
 * `renderContent` receives the header to put INSIDE its own scroll when the
 * layout is combined (mobile), and `undefined` when the header is a sibling
 * above the panel (desktop).
 */
export function ScreenSurface({ screen, onNavigate, header, renderContent, renderSetupPrompt }: {
  screen: ScreenId;
  onNavigate: Navigate;
  header: React.ReactNode;
  renderContent: (combinedHeader: React.ReactNode | undefined) => React.ReactNode;
  /** Shown instead of the screen when this Home isn't set up yet. Only the screens that have something to say about setup pass one; the rest get a spinner. */
  renderSetupPrompt?: () => React.ReactNode;
}) {
  const { width, gutter, compact } = useResponsiveLayout();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
  // Mobile's sticky header floats directly over scrolling content (unlike
  // desktop's, which sits on the plain surface background with nothing
  // scrolling under it), so a hard-edged solid fill would cut content off with
  // a visible line as it scrolls past. A gradient — solid at the top, fading to
  // transparent by the bottom — reads as the content dissolving under the
  // header instead. `colors.background`, not a static hex, so it stays right
  // if the app's background ever moves with the theme.
  const webStickyHeaderGradientStyle = Platform.OS === 'web'
    ? asViewStyle({ backgroundImage: `linear-gradient(to bottom, ${colors.background} 0%, ${colors.background} 60%, transparent 100%)` })
    : undefined;
  const combineHeader = width < PANEL_FRAMED_FROM;
  // `BottomNav` (web) floats `position: fixed` over content and CLAIMS its
  // own footprint in Bloom's bottom-edge registry (`bottom-nav.tsx`) — this
  // is the other half: content reads that claim back and pads itself clear
  // of it, or the last row or two sits underneath the fixed bar, unreachable
  // to a tap. Reads 0 wherever the bar isn't shown (desktop, native), so
  // this is a harmless no-op there.
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
  // `ContentPanel`'s viewport-mode overlays need to know how tall the sticky
  // header actually is so their own sticky math starts below it instead of at
  // true viewport top (see `overlayTopOffset`'s doc comment in Bloom) — real,
  // not a guess, since the header's height varies per screen (`AskHeader` vs
  // `ClassicHeader`, compact vs not).
  const [headerHeight, setHeaderHeight] = useState(0);
  // The combined header renders inside the screen's own PageScroll, which
  // pads ALL of its children for content that sits still — a header's own
  // background should still reach both true edges, so cancel that inherited
  // padding here rather than have every screen redo this itself. The header
  // already carries its own top AND bottom inset (symmetric, inside the
  // header itself), so no extra gap is needed here beyond the edge-bleed.
  // Sticky (web) for the same reason as the desktop external header: real
  // document scroll (`app/_layout.tsx`) means nothing keeps it in view on its
  // own otherwise — its containing block here is the screen's own content,
  // which is as tall as that screen, so `top: 0` pins it for the full scroll.
  const bleedHeader = (node: React.ReactNode) => (
    // The gradient lives on this wrapper, not the header itself — none of
    // `AskHeader`/`ClassicHeader`/the other headers paint a background of
    // their own (see their own doc comments), so the gradient shows straight
    // through without anything needing to opt out of an opaque fill.
    // `paddingTop: insets.top` here rather than in each of the six headers:
    // the gradient above then runs behind the status bar while the header's
    // own row starts below it, which is what draws the notch area as part of
    // the screen instead of a blank strip above it.
    <View style={[webStickyHeaderStyle, webStickyHeaderGradientStyle, { marginHorizontal: -gutter, paddingTop: insets.top }]}>{node}</View>
  );
  let content: React.ReactNode = renderContent(combineHeader ? bleedHeader(header) : undefined);

  // Swaps CONTENT ONLY (not `header`) for the sign-in prompt while Oxy auth
  // isn't ready — the same panel below still frames it, so it's not a
  // separately-styled screen, and whichever screen's own header/nav context
  // is already on the page stays put. Not a higher-level gate above
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
    <View className="min-h-0 min-w-0 flex-1 gap-2">
      {/* The header sits flush at the column's true top — no padding above
          it — so its `top: 0` sticky position has nothing extra to settle
          past. Its own bottom inset is conditional on `compact` (see
          `headers.tsx`) specifically so it stays OFF here on desktop, where
          this column's own `gap-2` already provides the gap before the panel
          — only the mobile/combined header (rendered elsewhere, inside the
          screen's own content) needs the header to supply its own. The
          panel's own breathing room from the screen's right/bottom edges
          (matching the rail on the left, which needs none) lives on ITS OWN
          wrapper below instead of the shared column, so it doesn't also push
          the header down. */}
      {!combineHeader && (
        // `bg-background`, not transparent: on web this is `position: sticky`
        // over real document scroll, so the screen's own scrolling content
        // passes BEHIND it, not away from it — without an opaque fill here,
        // that content shows straight through the header as it scrolls past.
        // Mobile's combined header has no such problem (see `bleedHeader`'s
        // gradient instead, which needs to fade rather than hard-cut), so
        // this only applies to this branch.
        <View className="bg-background" style={[webStickyHeaderStyle, { paddingTop: insets.top }]} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
          {header}
        </View>
      )}
      <View className="min-h-0 min-w-0 flex-1 sm:pb-2 sm:pr-2">
        {/* `overlayTopOffset`: the panel's default viewport-mode overlays are
            sized/positioned from the true viewport top, on the assumption
            that the panel starts near it. The sticky header above pushes
            where the panel visually starts without moving the overlay's own
            math, so without this the overlay would paint over the header. */}
        <ContentPanel framedFrom={PANEL_FRAMED_FROM} overlayTopOffset={combineHeader ? undefined : headerHeight} maskColor={colors.background} surfaceClassName="bg-card" contentClassName="min-h-0 min-w-0 flex-1" contentStyle={{ paddingBottom: panelBottomInset }}>
          {content}
        </ContentPanel>
      </View>
    </View>
  );
}
