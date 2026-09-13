import React from 'react';
import { ScrollView, View, type ScrollViewProps } from 'react-native';
import { CONTENT_MAX } from './metrics';
import { useResponsiveLayout } from './responsive-context';

export function ContentWidth({ children, maxWidth = CONTENT_MAX, padding = true }: {
  children: React.ReactNode; maxWidth?: number; padding?: boolean;
}) {
  const { gutter } = useResponsiveLayout();
  return <View className="w-full min-w-0 self-center" style={{ maxWidth, paddingHorizontal: padding ? gutter : 0 }}>{children}</View>;
}
export function PageScroll({ children, maxWidth = CONTENT_MAX, bottom = 28, contentContainerStyle, ...props }: ScrollViewProps & {
  children: React.ReactNode; maxWidth?: number; bottom?: number;
}) {
  return <ScrollView {...props} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled"
    className="min-h-0 flex-1" contentContainerStyle={[{ paddingBottom: bottom }, contentContainerStyle]}>
    <ContentWidth maxWidth={maxWidth}>{children}</ContentWidth>
  </ScrollView>;
}
/** One tree, not duplicated phone/tablet screens. DOM/focus/state order stays stable. */
export function PageColumns({ children, weights, gap = 24 }: {
  children: React.ReactNode; weights?: number[]; gap?: number;
}) {
  const { split } = useResponsiveLayout();
  return <View className="min-w-0" style={{ flexDirection: split ? 'row' : 'column', gap }}>
    {React.Children.toArray(children).map((child, index) => <View key={React.isValidElement(child) && child.key !== null ? child.key : index}
      className="min-w-0" style={split ? { flex: weights?.[index] ?? 1 } : undefined}>{child}</View>)}
  </View>;
}
/** Wrap small horizontal cards on larger surfaces, keep deliberate carousels on phones. */
export function CardStrip({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  const { compact } = useResponsiveLayout();
  return <ScrollView className="grow-0" horizontal scrollEnabled={compact} showsHorizontalScrollIndicator={false}
    contentContainerStyle={{ flexDirection: 'row', flexWrap: compact ? 'nowrap' : 'wrap', flexGrow: 1, width: compact ? undefined : '100%', gap }}>
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
    {React.Children.toArray(children).map((child, index) => <View key={React.isValidElement(child) && child.key !== null ? child.key : index} className="min-w-0" style={{ width: itemWidth }}>{child}</View>)}
  </View>;
}
