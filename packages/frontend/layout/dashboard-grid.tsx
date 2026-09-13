import React, { useCallback, useMemo, useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { packMasonry } from './metrics';
import { useResponsiveLayout } from './responsive-context';

export type DashboardCard = {
  id: string; content: React.ReactNode; estimatedHeight: number;
  span?: number; lane?: number;
};
type Measurement = { width: number; height: number; fontScale: number };
export function DashboardGrid({ cards, columns: explicitColumns }: { cards: readonly DashboardCard[]; columns?: number }) {
  const layout = useResponsiveLayout();
  const [measuredWidth, setWidth] = useState<number | null>(null);
  const [heights, setHeights] = useState<Record<string, Measurement>>({});
  const width = measuredWidth ?? layout.pageWidth;
  const columns = explicitColumns ?? layout.columns;
  const columnWidth = (width - layout.gap * (columns - 1)) / columns;
  const arranged = useMemo(() => packMasonry(cards.map(card => {
    const span = Math.min(columns, card.span ?? 1);
    const expectedWidth = columnWidth * span + layout.gap * (span - 1);
    const measured = heights[card.id];
    const valid = measured && Math.abs(measured.width - expectedWidth) < 1 && measured.fontScale === layout.fontScale;
    return { id: card.id, height: valid ? measured.height : card.estimatedHeight, span, lane: card.lane };
  }), width, columns, layout.gap), [cards, heights, width, columns, columnWidth, layout.gap, layout.fontScale]);
  const measureWidth = useCallback((event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0) setWidth(previous => previous !== null && Math.abs(previous - next) < 0.5 ? previous : next);
  }, []);
  const measureCard = (id: string, event: LayoutChangeEvent) => {
    const { width: cardWidth, height } = event.nativeEvent.layout;
    if (height <= 0) return;
    setHeights(previous => {
      const old = previous[id];
      if (old && Math.abs(old.width - cardWidth) < 0.5 && Math.abs(old.height - height) < 0.5 && old.fontScale === layout.fontScale) return previous;
      return { ...previous, [id]: { width: cardWidth, height, fontScale: layout.fontScale } };
    });
  };
  return <View testID="dashboard-grid" onLayout={measureWidth} className="relative w-full" style={{ height: arranged.height }}>
    {cards.map((card, index) => {
      const position = arranged.placements[index];
      if (!position) return null;
      return <View key={card.id} testID={`card-${card.id}`} onLayout={event => measureCard(card.id, event)}
        className="absolute min-w-0" style={{ left: position.x, top: position.y, width: position.width }}>
        {card.content}
      </View>;
    })}
  </View>;
}
