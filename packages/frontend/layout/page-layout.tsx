import React, { createContext, useContext } from 'react';
import { Platform, ScrollView, View, type ScrollViewProps } from 'react-native';
import { CONTENT_MAX } from './metrics';
import { useBottomEdgeInset } from '@oxy.so/bloom/layout';
import { useResponsiveLayout } from './use-responsive-layout';

const IS_WEB = Platform.OS === 'web';

/**
 * Where the app shell's one header is, as the screens below it need to know.
 *
 * The header is mounted once in the shell, never inside a screen. Above the
 * `shell:` width it is a real sibling above the panel and takes its own space,
 * so a screen needs no inset but the panel's overlays must start below it.
 * Below that width it is pinned OVER the panel, so it is the other way round:
 * the screen reserves its height and content passes underneath.
 */
type ShellHeader = { height: number; overlaysContent: boolean };
const ShellHeaderContext = createContext<ShellHeader>({ height: 0, overlaysContent: false });
export function ShellHeaderProvider({ value, children }: { value: ShellHeader; children: React.ReactNode }) {
  return <ShellHeaderContext.Provider value={value}>{children}</ShellHeaderContext.Provider>;
}
export function useShellHeader(): ShellHeader {
  return useContext(ShellHeaderContext);
}
/** The gutter as classes, so a resize restyles rather than re-renders. The numbers match `getLayoutMetrics`, which still reports them for the bleed margins that have to be real numbers. */
const GUTTER_CLASS = 'px-4 shell:px-6';
export function ContentWidth({ children, maxWidth = CONTENT_MAX, padding = true }: {
  children: React.ReactNode; maxWidth?: number; padding?: boolean;
}) {
  return <View className={`w-full min-w-0 self-center ${padding ? GUTTER_CLASS : ''}`} style={{ maxWidth }}>{children}</View>;
}
/**
 * WEB uses a real document-scroll model (the window is the scroller — see
 * `app/_layout.tsx`/`global.css`), so a nested `ScrollView` here would open a
 * SECOND, contained scroll region instead of letting the page grow — exactly
 * the "scroll happens inside a box" shape that was explicitly rejected in
 * favor of one real page scroll. It's a plain `View` on web. NATIVE has no
 * document-scroll equivalent, so it keeps a real `ScrollView`.
 */
export function PageScroll({ children, maxWidth = CONTENT_MAX, bottom = 28, ...props }: ScrollViewProps & {
  children: React.ReactNode; maxWidth?: number; bottom?: number;
}) {
  // On native the bottom bar floats over the last rows of the screen (see
  // `bottom-nav.tsx`), so the SCROLL runs to the window's bottom edge and its
  // CONTENT stops above the bar — content passes behind it as you scroll
  // instead of ending at a hard line above it. The bar publishes its own
  // footprint, safe area included, and reads 0 on the screens that don't show
  // one. Web's page already clears it at the panel (`screen-surface.tsx`),
  // where the bar is fixed over a scrolling document.
  const bottomEdgeInset = useBottomEdgeInset();
  const header = useShellHeader();
  const topInset = header.overlaysContent ? header.height : 0;
  if (IS_WEB) {
    return <View style={{ paddingTop: topInset, paddingBottom: bottom }}>
      <ContentWidth maxWidth={maxWidth}>{children}</ContentWidth>
    </View>;
  }
  // No scroll indicator, here and in every horizontal scroller in the app —
  // no Oxy app shows one. A bar sliding in over the right edge of a screen
  // that is already all rounded surfaces reads as damage, and on a phone the
  // finger is the position indicator.
  return <ScrollView {...props} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
    className="min-h-0 flex-1" contentContainerStyle={{ paddingTop: topInset, paddingBottom: bottom + bottomEdgeInset }}>
    <ContentWidth maxWidth={maxWidth}>{children}</ContentWidth>
  </ScrollView>;
}
/** One tree, not duplicated phone/tablet screens. DOM/focus/state order stays stable. */
export function PageColumns({ children, weights, gap = 24 }: {
  children: React.ReactNode; weights?: number[]; gap?: number;
}) {
  const { split } = useResponsiveLayout();
  return <View className={`min-w-0 ${split ? 'flex-row' : 'flex-col'}`} style={{ gap }}>
    {React.Children.toArray(children).map((child, index) => <View key={(child as React.ReactElement)?.key ?? index}
      className="min-w-0" style={split ? { flex: weights?.[index] ?? 1 } : undefined}>{child}</View>)}
  </View>;
}
/**
 * Wrap small horizontal cards on larger surfaces, keep deliberate carousels on
 * phones. `PageScroll`'s own horizontal padding is meant for content that sits
 * still — a real horizontal scroller must not inherit it as a hard edge, or it
 * can never pan flush to the true left/right edges. Negative margin cancels
 * that inherited padding; `contentContainerStyle`'s own padding puts the same
 * inset back, but on the scrollable CONTENT (its resting position), not the
 * container — so it still starts inset but can scroll past it.
 */
export function CardStrip({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  const { compact, gutter } = useResponsiveLayout();
  // `w-full` (width: 100%) is right for the WRAP case (non-compact) — it needs
  // a known width to wrap cards within. It actively BREAKS the bleed case
  // (compact): an explicit width locks the box's size, so a negative margin
  // on top of it only SHIFTS the box instead of growing it — the strip came up
  // short by exactly one `gutter` on each side. Compact lets width stay `auto`
  // so the negative margin can actually expand it.
  return <ScrollView className={compact ? undefined : 'w-full'} horizontal scrollEnabled={compact} showsHorizontalScrollIndicator={false}
    style={compact ? { marginHorizontal: -gutter } : undefined}
    contentContainerStyle={{ flexDirection: 'row', flexWrap: compact ? 'nowrap' : 'wrap', flexGrow: 1, width: compact ? undefined : '100%', gap, paddingHorizontal: compact ? gutter : undefined }}>
    {children}
  </ScrollView>;
}

export function SectionGrid({ children, minimumWidth = 300, gap = 24 }: {
  children: React.ReactNode; minimumWidth?: number; gap?: number;
}) {
  const { pageWidth, compact, fontScale } = useResponsiveLayout();
  const [measuredWidth, setMeasuredWidth] = React.useState<number | null>(null);
  const width = measuredWidth ?? pageWidth;
  const count = compact ? 1 : Math.max(1, Math.min(3, Math.floor((width + gap) / (minimumWidth * Math.min(Math.max(fontScale, 1), 1.4) + gap))));
  const itemWidth = Math.max(0, (width - gap * (count - 1)) / count);
  return <View className="w-full flex-row flex-wrap" style={{ gap }} onLayout={event => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) setMeasuredWidth(previous => previous !== null && Math.abs(previous - next) < 0.5 ? previous : next);
  }}>
    {React.Children.toArray(children).map((child, index) => <View key={(child as React.ReactElement)?.key ?? index} className="min-w-0" style={{ width: itemWidth }}>{child}</View>)}
  </View>;
}
