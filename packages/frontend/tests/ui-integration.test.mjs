import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname, join } from 'node:path';
import { SCREENS, SCREEN_ROUTES } from '../data/screens.ts';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ui = resolve(frontend, '../ui');
const read = file => readFileSync(file, 'utf8');
function sources(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sources(path) : /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

test('every screen navigates to an existing Expo Router file', () => {
  assert.equal(SCREENS.length, 12);
  for (const screen of SCREENS) {
    const path = SCREEN_ROUTES[screen.id];
    assert.ok(path, `${screen.id} has no route`);
    const file = join(frontend, 'app', path.slice(1) + '.tsx');
    assert.ok(existsSync(file), `${path} is a dead navigation target`);
    assert.match(read(file), new RegExp(`screen=["']${screen.id}["']`));
  }
});

test('home utility colors are registered and imported by the real app', () => {
  const css = read(join(ui, 'theme/home.css'));
  assert.match(read(join(frontend, 'global.css')), /@import ["']\.\.\/ui\/theme\/home\.css["']/);
  const registered = new Set([...css.matchAll(/--color-(home-[\w-]+)\s*:/g)].map(match => match[1]));
  for (const directory of ['screens', 'components', 'layout']) {
    for (const file of sources(join(frontend, directory))) {
      for (const match of read(file).matchAll(/(?:bg|text|border)-(home-[\w-]+)/g)) {
        assert.ok(registered.has(match[1]), `${file}: missing ${match[1]} color`);
      }
    }
  }
  for (const file of sources(ui)) {
    for (const match of read(file).matchAll(/(?:bg|text|border)-(home-[\w-]+)/g)) {
      assert.ok(registered.has(match[1]), `${file}: missing ${match[1]} color`);
    }
  }
});

test('retained routes share a single root overlay host', () => {
  const root = read(join(frontend, 'app/_layout.tsx'));
  const surface = read(join(frontend, 'components/screen-surface.tsx'));
  assert.equal((root.match(/<Overlays\s*\/>/g) ?? []).length, 1);
  assert.doesNotMatch(surface, /<Overlays|mockSystemChrome|9:30|hardwareBackPress/);
});

test('shared UI has no imports of app state, data, or screens', () => {
  for (const file of sources(ui)) {
    assert.doesNotMatch(read(file), /from ['"][^'"]*(?:frontend|@\/data|@\/state|@\/screens)/, file);
  }
});
