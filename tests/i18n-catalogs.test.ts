import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

type Catalog = { [key: string]: string | Catalog };
const LOCALES = new URL('../packages/frontend/i18n/locales/', import.meta.url);
const readCatalog = (file: string): Catalog => JSON.parse(readFileSync(new URL(file, LOCALES), 'utf8'));
const english = readCatalog('en.json');
const spanish = readCatalog('es.json');

/** `{ a: { b: 'x' } }` → `[['a.b', 'x']]`. */
function flatten(catalog: Catalog, prefix = ''): [string, string][] {
  return Object.entries(catalog).flatMap(([key, value]) =>
    typeof value === 'string' ? [[`${prefix}${key}`, value] as [string, string]] : flatten(value, `${prefix}${key}.`));
}
const englishEntries = new Map(flatten(english));
const spanishEntries = new Map(flatten(spanish));
const placeholders = (text: string) => [...text.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort();

test('the Spanish catalog has exactly the same keys as the English one', () => {
  const missingInSpanish = [...englishEntries.keys()].filter(key => !spanishEntries.has(key));
  const onlyInSpanish = [...spanishEntries.keys()].filter(key => !englishEntries.has(key));
  assert.deepEqual({ missingInSpanish, onlyInSpanish }, { missingInSpanish: [], onlyInSpanish: [] });
});

test('no translation is left empty', () => {
  const empty = [...englishEntries, ...spanishEntries].filter(([, text]) => text.trim() === '').map(([key]) => key);
  assert.deepEqual(empty, []);
});

test('every translation interpolates the same {{placeholders}} as its English original', () => {
  const mismatched = [...englishEntries].filter(([key, text]) => spanishEntries.has(key) && placeholders(text).join() !== placeholders(spanishEntries.get(key) ?? '').join()).map(([key]) => key);
  assert.deepEqual(mismatched, []);
});

test('every key in the catalog is used somewhere in the app', () => {
  // Keys are always written out literally (`t('home.noLights')`, or a
  // `ParseKeys` constant), so a key whose quoted text appears nowhere in the
  // source is a dead string nobody will ever see. Plural variants
  // (`sensors.more_one`/`_other`) are used through their base key.
  const sourceFiles = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (name === 'node_modules' || name === 'home-ui' || path.endsWith(join('app', 'ui'))) return [];
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
  const frontend = new URL('../packages/frontend', import.meta.url).pathname;
  const source = sourceFiles(frontend).map(file => readFileSync(file, 'utf8')).join('\n');
  const baseKeys = new Set([...englishEntries.keys()].map(key => key.replace(/_(zero|one|two|few|many|other)$/, '')));
  const unused = [...baseKeys].filter(key => !source.includes(`'${key}'`));
  assert.deepEqual(unused, []);
});
