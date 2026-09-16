import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DEMO_CATALOG } from '../packages/frontend/providers/demo-catalog.ts';

const english = JSON.parse(readFileSync(new URL('../packages/frontend/i18n/locales/en.json', import.meta.url), 'utf8')) as Record<string, unknown>;
const translation = (key: string): unknown => key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], english);

test('every demo device has its own id', () => {
  const duplicates = DEMO_CATALOG.map(entry => entry.id).filter((id, index, ids) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test('every demo name and room is a real translation key', () => {
  const missing = DEMO_CATALOG.flatMap(entry => [entry.nameKey, ...(entry.roomKey === null ? [] : [entry.roomKey])])
    .filter(key => typeof translation(key) !== 'string');
  assert.deepEqual(missing, []);
});

test('the catalogue covers the device types the demo promises', () => {
  const domains = new Set(DEMO_CATALOG.map(entry => entry.domain));
  for (const domain of ['light', 'climate', 'fan', 'vacuum', 'air-fryer', 'oven', 'dishwasher', 'washer', 'cover', 'lock', 'tv', 'camera', 'sensor', 'binary_sensor']) {
    assert.ok(domains.has(domain), `the demo home has no ${domain}`);
  }
});

test('every device carries at least one capability', () => {
  const bare = DEMO_CATALOG.filter(entry => entry.capabilities.length === 0).map(entry => entry.id);
  assert.deepEqual(bare, []);
});
