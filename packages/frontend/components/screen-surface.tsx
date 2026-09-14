import React, { useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { useAuth } from '@oxy.so/services';
import { SignInPrompt } from './sign-in-prompt';
import { type Navigate, type ScreenId } from '../data/screens';
import { BREAKPOINTS } from '../layout/metrics';
import { asViewStyle } from '../layout/web-style';
import { AskHeader, ClassicHeader } from './headers';
import { HomeScreen } from '../screens/home-screen';
import { FavoritesScreen } from '../screens/favorites-screen';
import { DevicesScreen } from '../screens/devices-screen';
import { AutomationsScreen, RoutinesScreen } from '../screens/automations-screen';
import { ActivityScreen, TimelineFilterProvider, TimelineHeader, TimelineScreen } from '../screens/activity-screen';
import { SettingsScreen } from '../screens/settings-screen';
import { AssistantHeader, AssistantScreen } from '../screens/assistant-screen';
import { ComposerHeader, ComposerProvider, ComposerScreen } from '../screens/composer-screen';
import { EmergencyHeader, EmergencyScreen } from '../screens/emergency-screen';
import { ContentPanel } from '@oxy.so/bloom/content-panel';
import { useBottomEdgeInset } from '@oxy.so/bloom/layout';
import { useTheme } from '@oxy.so/bloom/theme';
import { useResponsiveLayout } from '../layout/responsive-context';

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

export function ScreenSurface({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const { width, gutter } = useResponsiveLayout();
  const { colors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();
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
    <View style={[webStickyHeaderStyle, webStickyHeaderGradientStyle, { marginHorizontal: -gutter }]}>{node}</View>
  );
  let header: React.ReactNode;
  let content: React.ReactNode;
  // Only the screens whose header shares live state with their body (the
  // filter pill on Activity's timeline, the Save button on the automation
  // composer) need a provider around the header+panel column below; every
  // other screen's header is a plain call with props known right here.
  let wrapColumn: (column: React.ReactNode) => React.ReactNode = column => column;
  switch (screen) {
    case 'home': header = <AskHeader onNavigate={onNavigate}/>; content = <HomeScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'favorites': header = <ClassicHeader title="Spring Street Home" home notifications onNavigate={onNavigate}/>; content = <FavoritesScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'favorites-assistant': header = <ClassicHeader title="Spring Street Home" home onNavigate={onNavigate}/>; content = <FavoritesScreen withAssistant onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'devices': header = <ClassicHeader title="Devices" onNavigate={onNavigate}/>; content = <DevicesScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'activity': header = <AskHeader onNavigate={onNavigate}/>; content = <ActivityScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'timeline':
      header = <TimelineHeader onNavigate={onNavigate}/>;
      content = <TimelineScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>;
      wrapColumn = column => <TimelineFilterProvider>{column}</TimelineFilterProvider>;
      break;
    case 'automations': header = <AskHeader onNavigate={onNavigate}/>; content = <AutomationsScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'routines': header = <ClassicHeader title="Automations" onNavigate={onNavigate}/>; content = <RoutinesScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'settings': header = <ClassicHeader title="Settings" onNavigate={onNavigate}/>; content = <SettingsScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'assistant': header = <AssistantHeader onNavigate={onNavigate}/>; content = <AssistantScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
    case 'composer':
      header = <ComposerHeader onNavigate={onNavigate}/>;
      content = <ComposerScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>;
      wrapColumn = column => <ComposerProvider onNavigate={onNavigate}>{column}</ComposerProvider>;
      break;
    case 'emergency': header = <EmergencyHeader onNavigate={onNavigate}/>; content = <EmergencyScreen onNavigate={onNavigate} header={combineHeader ? bleedHeader(header) : undefined}/>; break;
  }

  // Swaps CONTENT ONLY (not `header`) for the sign-in prompt while signed
  // out of Oxy — the same panel below still frames it, so it's not a
  // separately-styled screen, and whichever screen's own header/nav
  // context is already on the page stays put. Not a higher-level gate
  // above `<Slot/>`/`<Stack/>` (`app/_layout.tsx`'s own doc comment on
  // `AppShell` says why): that would intercept before this component —
  // and its one shared `ContentPanel` below — ever mounted.
  if (!isAuthResolved) {
    content = <View className="min-h-0 min-w-0 flex-1 items-center justify-center"><ActivityIndicator color={colors.primary}/></View>;
  } else if (!isAuthenticated) {
    content = <SignInPrompt/>;
  }

  return wrapColumn(
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
        <View style={webStickyHeaderStyle} onLayout={event => setHeaderHeight(event.nativeEvent.layout.height)}>
          {header}
        </View>
      )}
      <View className="min-h-0 min-w-0 flex-1 sm:pb-2 sm:pr-2">
        {/* `overlayTopOffset`: the panel's default viewport-mode overlays are
            sized/positioned from the true viewport top, on the assumption
            that the panel starts near it. The sticky header above pushes
            where the panel visually starts without moving the overlay's own
            math, so without this the overlay would paint over the header. */}
        <ContentPanel framedFrom={PANEL_FRAMED_FROM} overlayTopOffset={combineHeader ? undefined : headerHeight} maskColor={colors.background} surfaceClassName="bg-card" contentClassName="min-h-0 min-w-0 flex-1" contentStyle={{ paddingBottom: bottomEdgeInset }}>
          {content}
        </ContentPanel>
      </View>
    </View>
  );
}
