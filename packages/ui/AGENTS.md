# @willo.sh/ui

Pure, app-agnostic UI components and design tokens for Willo — no screens, no
routing, no app state. This mirrors how other Oxy apps consume `@oxy.so/bloom`:
a component library, not a place for feature code.

Contents:
- `components/icon.tsx` — shared SVG glyph set (`Icon`, `IconName`).
- `components/primitives.tsx` — generic building blocks (`Label`, `IconButton`,
  `Avatar`, `SectionTitle`, `Tile`, `AddButton`, `Pill`) used by the Spring
  Home–derived screens living in `packages/frontend`.
- `components/Level.tsx` — the draggable circular level/slider control shared
  by the hand-built `ThermostatView`/`LightSheet` screens.
- `colors.ts`, `styles.tsx`, `constants.ts` — the original Willo thermostat/
  light UI's color ramps, emotion-styled text primitives (`Degree`,
  `Percentage`, `LabelBox`, exported here as `CaptionLabel`), and box-size
  constants.
- `theme/tokens.ts` — the Spring Home kit's own color tokens (`colors`,
  `tones`, `Tone`) as Tailwind class strings.

## Screens, state, and data live in `packages/frontend`, not here

`packages/frontend/screens/` (the 9 Spring Home–derived screen files plus
`EntitiesView`/`ThermostatView`/`LightSheet`/`RoutedScreen`),
`packages/frontend/components/` (`screen-surface`, `overlays`, `headers`,
`bottom-nav`, `camera-card`, `event-row`, `routine-row` — all wired to
`useHome`/`data/*`), `packages/frontend/state/`, and `packages/frontend/data/`
are app-specific and were moved out of this package on purpose. This package
must never import from `packages/frontend` by relative path or otherwise —
dependencies only flow frontend → ui.

`state/home-context.tsx`'s `HomeProvider` (in frontend) is a local
`useReducer` with no connection to Home Assistant — it's the Spring Home kit's
own demo state, driving the 9 kit screens while they're wired to real data one
at a time. Do not assume anything under `frontend/screens/` reflects a real
device.

## Overlays use Bloom's detached bottom sheet

`frontend/components/overlays.tsx` uses `@oxy.so/bloom/bottom-sheet`'s
`BottomSheet` with `detached`, not a hand-rolled modal. That's the only
approved use of Bloom outside the Sign-in-with-Oxy integration in
`packages/frontend`'s `_layout.tsx` — the kit's own colors/components stay as
they are otherwise (no Bloom `Slider`, no Bloom color tokens).

## Relative imports only — no `@/` alias inside this package

`@oxy.so/app-preset/babel` hardcodes `alias: { '@': './' }` resolved against
the *consuming app's* root (`packages/frontend`), not the package that defines
it — so from inside `@willo.sh/ui`, `@/` would silently resolve into
`packages/frontend/`, not here, both for Metro at runtime and for `tsc` when
frontend's compilation pulls this package in as raw source. Use plain relative
paths (`../theme/tokens`, `./icon`, etc.) instead. Do not reintroduce `@/`
here.
