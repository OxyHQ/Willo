/**
 * Logical React Native units (CSS px on web), never physical device pixels.
 *
 * `rail` MUST match `ContentPanel`'s `framedFrom` (`screen-surface.tsx`'s
 * `PANEL_FRAMED_FROM`) and the header combine threshold there — three
 * independently-implemented responsive behaviors (nav rail vs. bottom nav,
 * header external-sibling vs. combined-into-content, panel framed vs.
 * full-bleed) that all need to flip at the SAME width, or a band of widths
 * shows one flipped and the others not — e.g. the rail still visible while the
 * header has already jumped inside the (still full-bleed) panel.
 */
export const BREAKPOINTS = { rail: 640, expanded: 1024 } as const;
export const CONTENT_MAX = 1440;
export const GRID_GAP = 12;

export type LayoutMetrics = ReturnType<typeof getLayoutMetrics>;
export function getLayoutMetrics(width: number, height: number, fontScale = 1) {
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 390;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 844;
  const scale = Number.isFinite(fontScale) && fontScale > 0 ? fontScale : 1;
  const compact = safeWidth < BREAKPOINTS.rail;
  const expanded = safeWidth >= BREAKPOINTS.expanded;
  const navigationWidth = compact ? 0 : 80;
  const gutter = compact ? 16 : 24;
  const contentWidth = Math.max(0, Math.min(CONTENT_MAX, safeWidth - navigationWidth));
  const pageWidth = Math.max(0, contentWidth - 2 * gutter);
  const minimumCard = 196 * Math.min(Math.max(scale, 1), 1.65);
  const columns = compact ? 2 : Math.max(1, Math.min(4, Math.floor((pageWidth + GRID_GAP) / (minimumCard + GRID_GAP))));
  return {
    width: safeWidth, height: safeHeight, fontScale: scale,
    compact, expanded, navigationWidth, gutter, contentWidth, pageWidth,
    columns, gap: compact ? 8 : GRID_GAP,
    split: pageWidth >= 820 * Math.min(Math.max(scale, 1), 1.4),
  };
}

export type MasonryItem = {
  id: string;
  height: number;
  span?: number;
  /** A semantic lane from the reference. Only honored for the four-column dashboard. */
  lane?: number;
};
export type Placement = { id: string; x: number; y: number; width: number; height: number };
/** Pure skyline layout. Stable item IDs mean cards are never reparented on resize. */
export function packMasonry(items: readonly MasonryItem[], width: number, count: number, gap: number) {
  const columns = Math.max(1, Math.floor(Number.isFinite(count) ? count : 1));
  const safeWidth = Math.max(0, Number.isFinite(width) ? width : 0);
  const safeGap = Math.max(0, Math.min(Number.isFinite(gap) ? gap : 0, safeWidth / columns));
  const columnWidth = Math.max(0, (safeWidth - safeGap * (columns - 1)) / columns);
  const bottoms = Array.from({ length: columns }, () => 0);
  const ids = new Set<string>();
  const placements: Placement[] = [];
  for (const item of items) {
    if (ids.has(item.id)) throw new Error(`Duplicate dashboard card ID: ${item.id}`);
    ids.add(item.id);
    const span = Math.max(1, Math.min(columns, Math.floor(item.span ?? 1)));
    const itemHeight = Math.max(0, Number.isFinite(item.height) ? item.height : 0);
    let lane = 0;
    let y = Infinity;
    for (let start = 0; start <= columns - span; start += 1) {
      const top = Math.max(...bottoms.slice(start, start + span));
      if (top < y) { y = top; lane = start; }
    }
    if (columns === 4 && item.lane !== undefined) {
      lane = Math.max(0, Math.min(columns - span, Math.floor(item.lane)));
      y = Math.max(...bottoms.slice(lane, lane + span));
    }
    placements.push({ id: item.id, x: lane * (columnWidth + safeGap), y, width: columnWidth * span + safeGap * (span - 1), height: itemHeight });
    for (let i = lane; i < lane + span; i += 1) bottoms[i] = y + itemHeight + safeGap;
  }
  return { placements, height: items.length ? Math.max(...bottoms) - safeGap : 0, columnWidth };
}
