import test from 'node:test';
import assert from 'node:assert/strict';
import { BREAKPOINTS, getLayoutMetrics, packMasonry } from '../packages/frontend/layout/metrics.ts';
import { isNavigationActive, modernTabs, classicTabs } from '../packages/frontend/components/navigation-items.ts';
import { homeReducer, initialHomeState } from '../packages/frontend/state/home-reducer.ts';

for (const [width, rail] of [[320, false], [599, false], [600, true], [1024, true], [1439, true], [1440, true]] as const) {
  test(`navigation boundary at ${width}`, () => {
    const layout = getLayoutMetrics(width, 900);
    assert.equal(!layout.compact, rail);
    assert.ok(layout.contentWidth + layout.navigationWidth <= width);
  });
}
test('tablet landscape matches the four-column reference', () => {
  assert.equal(getLayoutMetrics(1024, 768).columns, 4);
  assert.equal(getLayoutMetrics(834, 1194).columns, 3);
  assert.equal(getLayoutMetrics(768, 1024).columns, 3);
  assert.equal(getLayoutMetrics(600, 960).columns, 2);
});
test('wide desktop content has a cap instead of stretching endlessly', () => {
  const layout = getLayoutMetrics(2560, 1440);
  assert.equal(layout.contentWidth, 1440);
  assert.equal(layout.columns, 4);
});
test('geometry depends on host width, not device orientation or model', () => {
  assert.equal(getLayoutMetrics(520, 1100).compact, true);
  assert.equal(getLayoutMetrics(1024, 500).compact, false);
  assert.equal(BREAKPOINTS.rail, 600);
});
test('larger font scales allocate fewer, wider dashboard columns', () => {
  const ordinary = getLayoutMetrics(1024, 768, 1);
  const enlarged = getLayoutMetrics(1024, 768, 1.8);
  assert.ok(enlarged.columns < ordinary.columns);
  assert.equal(enlarged.split, false);
});
test('invalid dimensions fall back to finite metrics', () => {
  for (const n of [0, -1, NaN, Infinity]) {
    const layout = getLayoutMetrics(n, n, n);
    assert.ok(layout.width > 0 && Number.isFinite(layout.width));
    assert.ok(layout.height > 0 && Number.isFinite(layout.height));
    assert.ok(layout.fontScale > 0 && Number.isFinite(layout.fontScale));
  }
});
test('mobile camera spans both columns, preserving the original content order', () => {
  const result = packMasonry([
    { id: 'camera', span: 2, height: 188 }, { id: 'lock', height: 80 },
    { id: 'light', height: 80 }, { id: 'thermostat', span: 2, height: 228 },
  ], 358, 2, 8);
  assert.equal(result.placements[0]?.width, 358);
  assert.equal(result.placements[1]?.y, 196);
  assert.equal(result.placements[2]?.y, 196);
  assert.equal(result.placements[3]?.y, 284);
});
test('four-column semantic lanes follow the supplied tablet reference', () => {
  const result = packMasonry([{ id: 'camera', height: 170, lane: 0 }, { id: 'lock', height: 80, lane: 0 }, { id: 'light', height: 80, lane: 1 }, { id: 'thermostat', height: 224, lane: 2 }], 896, 4, 12);
  assert.equal(result.placements[1]?.y, 182);
  assert.equal(result.placements[2]?.y, 0);
  assert.ok((result.placements[3]?.x ?? -1) > (result.placements[2]?.x ?? Infinity));
});
test('semantic lanes are ignored at two and three columns', () => {
  const result = packMasonry([{ id: 'a', height: 80, lane: 3 }, { id: 'b', height: 80, lane: 3 }], 600, 3, 12);
  assert.equal(result.placements[0]?.x, 0);
  assert.ok((result.placements[1]?.x ?? -1) > 0);
});
test('empty and sparse dashboards do not leave negative heights', () => {
  assert.equal(packMasonry([], 600, 3, 12).height, 0);
  assert.equal(packMasonry([{ id: 'only', height: 60 }], 600, 4, 12).height, 60);
});
test('IDs stay stable when geometry changes', () => {
  const items = [{ id: 'lock', height: 80 }, { id: 'light', height: 80 }, { id: 'thermostat', height: 224 }];
  assert.deepEqual(packMasonry(items, 350, 2, 8).placements.map(i => i.id), packMasonry(items, 1100, 4, 12).placements.map(i => i.id));
});
test('duplicate IDs are rejected instead of silently corrupting React reconciliation', () => {
  assert.throws(() => packMasonry([{ id: 'x', height: 10 }, { id: 'x', height: 20 }], 300, 2, 8), /Duplicate/);
});
test('a taller measured card pushes subsequent cards down without overlap', () => {
  const result = packMasonry([{ id: 'long-title', height: 178, lane: 0 }, { id: 'below', height: 80, lane: 0 }], 900, 4, 12);
  assert.equal(result.placements[1]?.y, 190);
});
test('all placements stay in bounds and do not overlap across 46 widths', () => {
  for (let width = 320; width < 2000; width += 37) {
    const metrics = getLayoutMetrics(width, 900);
    const items = Array.from({ length: 17 }, (_, index) => ({ id: String(index), height: 70 + index * 17 % 191, span: metrics.compact && index % 5 === 0 ? 2 : 1 }));
    const packed = packMasonry(items, metrics.pageWidth, metrics.columns, metrics.gap);
    for (const [i, a] of packed.placements.entries()) {
      assert.ok(a.x >= 0 && a.x + a.width <= metrics.pageWidth + 0.001);
      assert.ok(a.y >= 0 && a.y + a.height <= packed.height + 0.001);
      for (const b of packed.placements.slice(i + 1)) {
        const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
        assert.ok(overlapX <= 0.001 || overlapY <= 0.001);
      }
    }
  }
});
test('bottom navigation and rail use the same destinations and parent selection', () => {
  assert.equal(modernTabs.length, 3);
  assert.equal(classicTabs.length, 5);
  assert.equal(isNavigationActive('favorites-assistant', 'favorites'), true);
  assert.equal(isNavigationActive('composer', 'automations'), true);
  assert.equal(isNavigationActive('assistant', 'home'), true);
});
test('new reference tiles use the existing reducer rather than separate desktop state', () => {
  let state = initialHomeState;
  for (const id of ['fan', 'garage', 'speaker', 'floor-lamp'] as const) {
    state = homeReducer(state, { type: 'TOGGLE_DEVICE', id });
    assert.notEqual(state.devices[id], initialHomeState.devices[id]);
  }
  state = homeReducer(state, { type: 'SET_BRIGHTNESS', id: 'floor-lamp', value: 76 });
  assert.equal(state.brightness['floor-lamp'], 76);
});
