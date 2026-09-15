import test from 'node:test';
import assert from 'node:assert/strict';
import type { AnimationObject } from 'lottie-react-native';
import { cropLottie } from '../packages/frontend/components/lottie-crop.ts';

function exportedAnimation(): AnimationObject {
  return {
    v: '5.6.6', fr: 60, ip: 0, op: 84, w: 360, h: 360,
    assets: [{ id: 'comp_0', layers: [] }],
    layers: [{ ind: 1, ty: 4, ks: {}, shapes: [] }, { ind: 2, ty: 3, ks: {} }],
  };
}

test('a cropped animation takes the crop box as its canvas size', () => {
  const cropped = cropLottie(exportedAnimation(), { x: 58, y: 92, width: 276, height: 187 });
  assert.equal(cropped.w, 276);
  assert.equal(cropped.h, 187);
});

test('the original drawing is shown through one precomp layer shifted by the crop origin', () => {
  const animation = exportedAnimation();
  const cropped = cropLottie(animation, { x: 58, y: 92, width: 276, height: 187 });
  assert.equal(cropped.layers.length, 1);
  const [frame] = cropped.layers;
  assert.equal(frame.ty, 0);
  assert.deepEqual(frame.ks.p.k, [-58, -92, 0]);
  assert.deepEqual([frame.w, frame.h, frame.ip, frame.op], [360, 360, 0, 84]);
  const composition = cropped.assets.find((asset) => asset.id === frame.refId);
  assert.equal(composition.layers, animation.layers);
});

test('cropping keeps the existing precomps and leaves the source animation unchanged', () => {
  const animation = exportedAnimation();
  const cropped = cropLottie(animation, { x: 0, y: 0, width: 100, height: 100 });
  assert.equal(cropped.assets[0], animation.assets[0]);
  assert.equal(animation.w, 360);
  assert.equal(animation.layers.length, 2);
  assert.equal(animation.assets.length, 1);
});
