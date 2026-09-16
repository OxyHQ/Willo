/**
 * Dashboard cards come in whole tile rows, so a tall card always ends level
 * with the stack of tiles beside it: a camera or the thermostat is exactly the
 * two tiles ("Lamp" + "TV") it sits next to, never a few pixels off.
 *
 * A row is one device tile, and a card covering several rows also covers the
 * grid gaps between them — which is why this takes the gap rather than
 * hardcoding one: the grid uses a smaller gap when compact
 * (`layout/metrics.ts`).
 */
export const CARD_ROW_HEIGHT = 80;

export const cardHeight = (rows: number, gap: number): number => CARD_ROW_HEIGHT * rows + gap * (rows - 1);

/** The smallest whole number of rows that fits `contentHeight` — for a card whose own content decides how tall it is, like the sensor readings list. */
export const cardRowsFor = (contentHeight: number, gap: number): number => {
  let rows = 1;
  while (cardHeight(rows, gap) < contentHeight) rows += 1;
  return rows;
};
