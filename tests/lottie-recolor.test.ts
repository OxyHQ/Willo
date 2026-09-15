import test from 'node:test';
import assert from 'node:assert/strict';
import type { AnimationObject } from 'lottie-react-native';
import { recolorLottie, type LottiePalette } from '../packages/frontend/components/lottie-recolor.ts';
import { LOTTIE_ANIMATIONS } from '../packages/frontend/data/lottie-animations.ts';

const BLUE = [0.259, 0.522, 0.957, 1];
const GREY = [0.741, 0.757, 0.776, 1];
const RED: readonly [number, number, number] = [1, 0, 0];
const BLUE_TO_RED: LottiePalette = new Map([['#4285f4', RED]]);

function animationWithShapes(shapes: unknown[], assets: unknown[] = []): AnimationObject {
  return { v: '5.6.6', fr: 60, ip: 0, op: 60, w: 100, h: 100, assets, layers: [{ ty: 4, ks: { p: { a: 0, k: [50, 50, 0] } }, shapes }] };
}

test('a static fill in a mapped colour takes the palette colour and keeps its alpha', () => {
  const animation = animationWithShapes([{ ty: 'fl', c: { a: 0, k: [0.259, 0.522, 0.957, 0.5] } }]);
  const recolored = recolorLottie(animation, BLUE_TO_RED);
  assert.deepEqual(recolored.layers[0].shapes[0].c.k, [1, 0, 0, 0.5]);
});

test('a colour that is not in the palette keeps its exported value', () => {
  const animation = animationWithShapes([{ ty: 'st', c: { a: 0, k: GREY } }]);
  assert.equal(recolorLottie(animation, BLUE_TO_RED), animation);
});

test('an animated colour is recoloured in every keyframe, start and end', () => {
  const animation = animationWithShapes([
    { ty: 'fl', c: { a: 1, k: [{ t: 0, s: GREY, e: BLUE }, { t: 30, s: BLUE }] } },
  ]);
  const keyframes = recolorLottie(animation, BLUE_TO_RED).layers[0].shapes[0].c.k;
  assert.deepEqual(keyframes, [{ t: 0, s: GREY, e: [1, 0, 0, 1] }, { t: 30, s: [1, 0, 0, 1] }]);
});

test('a gradient recolours its colour stops and leaves offsets and opacity stops alone', () => {
  const animation = animationWithShapes([
    { ty: 'gf', g: { p: 2, k: { a: 0, k: [0, 0.259, 0.522, 0.957, 1, 0.741, 0.757, 0.776, 0, 1, 1, 0.4] } } },
  ]);
  const stops = recolorLottie(animation, BLUE_TO_RED).layers[0].shapes[0].g.k.k;
  assert.deepEqual(stops, [0, 1, 0, 0, 1, 0.741, 0.757, 0.776, 0, 1, 1, 0.4]);
});

test('fills nested in groups and in precomp layers are recoloured', () => {
  const nestedFill = { ty: 'gr', it: [{ ty: 'gr', it: [{ ty: 'fl', c: { a: 0, k: BLUE } }] }] };
  const animation = animationWithShapes([nestedFill], [{ id: 'comp_0', layers: [{ ty: 4, shapes: [nestedFill] }] }]);
  const recolored = recolorLottie(animation, BLUE_TO_RED);
  assert.deepEqual(recolored.layers[0].shapes[0].it[0].it[0].c.k, [1, 0, 0, 1]);
  assert.deepEqual(recolored.assets[0].layers[0].shapes[0].it[0].it[0].c.k, [1, 0, 0, 1]);
});

test('recolouring copies only what changed and never mutates the source animation', () => {
  const untouchedPath = { ty: 'sh', ks: { a: 0, k: { v: [[0, 0]], i: [[0, 0]], o: [[0, 0]], c: true } } };
  const animation = animationWithShapes([untouchedPath, { ty: 'fl', c: { a: 0, k: BLUE } }]);
  const recolored = recolorLottie(animation, BLUE_TO_RED);
  assert.notEqual(recolored, animation);
  assert.equal(recolored.layers[0].shapes[0], untouchedPath);
  assert.equal(recolored.layers[0].ks, animation.layers[0].ks);
  assert.deepEqual(animation.layers[0].shapes[1].c.k, BLUE);
});

test('every colour a registered animation maps to a Bloom role appears in that animation', () => {
  for (const [name, animation] of Object.entries(LOTTIE_ANIMATIONS)) {
    for (const sourceHex of Object.keys(animation.colorRoles)) {
      const palette: LottiePalette = new Map([[sourceHex, RED]]);
      assert.notEqual(recolorLottie(animation.source, palette), animation.source, `${name} never uses ${sourceHex}`);
    }
  }
});
