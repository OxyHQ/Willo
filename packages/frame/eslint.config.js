// Minimal ESLint. Biome (root `biome.json`) does formatting and all other linting; ESLint
// keeps only the shared preset's rules that Biome has no equivalent for:
//
// - `expo/*` — `no-env-var-destructuring` / `no-dynamic-env-var` catch `EXPO_PUBLIC_*`
//   reads Metro cannot inline (destructuring or a computed key ships `undefined` to the
//   bundle with no build error); `use-dom-exports` guards `'use dom'` components.
// - `react-hooks/*` React Compiler checks (purity, refs, immutability, set-state-in-effect…).
//
// `react-hooks/rules-of-hooks` and `react-hooks/exhaustive-deps` are dropped: Biome's
// `useHookAtTopLevel` / `useExhaustiveDependencies` cover them. The preset still supplies the
// parser, plugins, settings and `dist/*` ignore.
const oxyConfig = require('@oxy.so/app-preset/eslint');

const PORTED_TO_BIOME = new Set(['react-hooks/rules-of-hooks', 'react-hooks/exhaustive-deps']);

// Baselined at `warn`: these fire on existing code and were never enforced (the previous full
// preset crashed ESLint 10 inside eslint-plugin-react before reporting anything). Tighten back
// to `error` once the flagged components are fixed.
const BASELINE_WARN = new Set([
  'react-hooks/immutability',
  'react-hooks/refs',
  'react-hooks/set-state-in-effect',
]);

const keep = (name) =>
  (name.startsWith('expo/') || name.startsWith('react-hooks/')) && !PORTED_TO_BIOME.has(name);

const severity = (name, setting) => (BASELINE_WARN.has(name) ? 'warn' : setting);

module.exports = oxyConfig.map(({ rules, ...config }) => {
  if (!rules) return config;
  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(rules)
        .filter(([name]) => keep(name))
        .map(([name, setting]) => [name, severity(name, setting)]),
    ),
  };
});
