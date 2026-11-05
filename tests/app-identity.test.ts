import { afterEach, expect, test } from 'bun:test';
import path from 'node:path';

type ExpoConfig = {
  name: string;
  ios?: { bundleIdentifier?: string };
  android?: { package?: string };
};

const saved = { ...process.env };
afterEach(() => {
  process.env = { ...saved };
});

/** The app's resolved config, read fresh under the given APP_VARIANT. */
function loadConfig(app: 'frontend' | 'frame', variant?: string): ExpoConfig {
  process.env.EXPO_PUBLIC_OXY_CLIENT_ID ??= 'oxy_dk_test';
  if (variant === undefined) delete process.env.APP_VARIANT;
  else process.env.APP_VARIANT = variant;
  const file = path.resolve(import.meta.dir, `../packages/${app}/app.config.js`);
  delete require.cache[file];
  return (require(file) as { expo: ExpoConfig }).expo;
}

test('Willo is sh.willo.app, and sh.willo.app.dev under APP_VARIANT=development', () => {
  const prod = loadConfig('frontend');
  expect(prod.android?.package).toBe('sh.willo.app');
  expect(prod.ios?.bundleIdentifier).toBe('sh.willo.app');
  const dev = loadConfig('frontend', 'development');
  expect(dev.android?.package).toBe('sh.willo.app.dev');
  expect(dev.ios?.bundleIdentifier).toBe('sh.willo.app.dev');
  expect(dev.name).not.toBe(prod.name);
});

test('Frame by Willo is sh.willo.frame, and sh.willo.frame.dev under APP_VARIANT=development', () => {
  const prod = loadConfig('frame');
  expect(prod.android?.package).toBe('sh.willo.frame');
  const dev = loadConfig('frame', 'development');
  expect(dev.android?.package).toBe('sh.willo.frame.dev');
  expect(dev.name).not.toBe(prod.name);
});
