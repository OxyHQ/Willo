import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { colors, tones } from '../packages/ui/theme/tokens.ts';
import { SCREENS } from '../packages/frontend/data/screens.ts';
import { SCREEN_ROUTES } from '../packages/frontend/data/screen-routes.ts';

const theme = readFileSync(new URL('../packages/ui/theme/home-ui.css', import.meta.url), 'utf8');
const globalCss = readFileSync(new URL('../packages/frontend/global.css', import.meta.url), 'utf8');

test('every icon palette color has the same Tailwind theme value', () => {
  for (const [name, value] of Object.entries(colors)) {
    const token = name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`);
    assert.ok(theme.includes(`--color-home-${token}: ${value};`), `Missing or mismatched ${token}`);
  }
});

test('every tile tone resolves to a registered color utility', () => {
  for (const tone of Object.values(tones)) {
    for (const className of [tone.tile, tone.text]) {
      const token = className.replace(/^(bg|text)-/, '');
      assert.ok(theme.includes(`--color-${token}:`), `Unregistered utility ${className}`);
    }
  }
});

test('the frontend loads the UI theme and scans the responsive layout source', () => {
  assert.ok(globalCss.includes('@import "../ui/theme/home-ui.css";'));
  assert.ok(globalCss.includes('@source "./layout/**/*.{js,jsx,ts,tsx}";'));
  assert.ok(globalCss.includes('@source "../ui/**/*.{js,jsx,ts,tsx}";'));
});

test('all twelve screens have distinct route destinations', () => {
  assert.deepEqual(Object.keys(SCREEN_ROUTES).sort(), SCREENS.map(screen => screen.id).sort());
  assert.equal(new Set(Object.values(SCREEN_ROUTES)).size, SCREENS.length);
});

test('Home navigates to the existing index instead of a missing /home route', () => {
  assert.equal(SCREEN_ROUTES.home, '/');
  assert.equal(SCREEN_ROUTES['favorites-assistant'], '/favorites-assistant');
  assert.equal(SCREEN_ROUTES.devices, '/devices');
});
