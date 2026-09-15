export const colors = {
  ink: '#202124', muted: '#5f6368', nav: '#f0f5ff',
  blue: '#d9e1ff', onBlue: '#064aba', sky: '#c1e8fc', onSky: '#00537f',
  yellow: '#fff0c8', yellowFill: '#ffe182', onYellow: '#625007',
  peach: '#ffddd1', peachButton: '#ffb799', onPeach: '#8e3205',
  green: '#e1f5df', onGreen: '#146524', red: '#b3261e',
} as const;
// Complete, static class strings: NativeWind's compiler can discover every variant.
// `sky`/`blue`'s `tile`/`text` are Bloom's own real, CSS-variable-backed
// classes, so they already follow the active theme/mode with no JS needed.
// `sky` → `primary` (it IS the app's seed color — see `BloomProvider` in
// `app/_layout.tsx`). `blue` → `info`, NOT `secondary`: Bloom's
// `secondary`/`tertiary` are auto-DERIVED from the seed via M3 color theory
// and can land on any hue (for this seed, `secondary` resolves to a red) —
// they are not "a second/third brand blue" to grab. Status colors
// (`success`/`error`/`warning`/`info`) are the ones with a semantically FIXED
// hue regardless of seed, and `info` is blue, matching what this tone always
// meant here (TV/blinds/vacuum/lock/fan — devices that are on, not literally
// "informational", but the right blue). `color` (the plain inline value
// `Tile`'s `<Icon>` falls back to) stays the static brand hex for now —
// `Tile` overrides it live via `useTheme()` for tones migrated so far; the
// rest migrate the same way in a later pass.
export const tones = {
  blue: { tile: 'bg-info-subtle', text: 'text-info-text', color: colors.onBlue },
  sky: { tile: 'bg-primary-subtle', text: 'text-primary-text', color: colors.onSky },
  // `secondary` is pinned to this exact yellow in `BloomProvider`
  // (`app/_layout.tsx`'s `secondaryColor`), not left to the seed's own
  // auto-derived hue — see that prop's doc comment.
  yellow: { tile: 'bg-secondary-subtle', text: 'text-secondary-text', color: colors.onYellow },
  // `tertiary` is pinned to this exact peach in `BloomProvider`
  // (`app/_layout.tsx`'s `tertiaryColor`), not left to the seed's own
  // auto-derived hue — see that prop's doc comment.
  peach: { tile: 'bg-tertiary-subtle', text: 'text-tertiary-text', color: colors.onPeach },
  // `success`, a status color with a semantically FIXED green hue (like
  // `blue` → `info`) — Wi-Fi/connected is exactly what it's for.
  green: { tile: 'bg-success-subtle', text: 'text-success-text', color: colors.onGreen },
  // `muted` is Bloom's own real "inactive surface" token — a closer semantic
  // fit for an OFF device than the generic page `background`.
  neutral: { tile: 'bg-muted', text: 'text-muted-foreground', color: colors.ink },
} as const;
export type Tone = keyof typeof tones;
