# Responsive reference UI

This change integrates the approved responsive layout into Willo's existing Expo Router app. It does not install a second app or a gallery, change dependencies, or replace the Oxy preset.

## What was corrected

The reference components used `home-*` classes, but `global.css` did not register their colors. `packages/ui/theme/home-ui.css` now supplies the Tailwind 4 theme, imported after the app preset and checked against the shared TypeScript icon palette.

`ScreenSurface` measures its actual host. Below 600 logical pixels it keeps the bottom navigation; from 600 it uses an 80-pixel rail; at 1440 the rail expands to 184 pixels. Content is capped at 1440 pixels. The dashboard adapts between two, three and four columns, with additional width allowance for increased font scale. The four-column home layout follows the camera/lock, lighting/media, climate/camera and environmental lanes of the tablet reference.

Cards remain in one keyed React tree. Their measured heights determine packing, including wrapped text; resizing does not intentionally create a separate desktop store or remount the whole screen. Activity, routines and settings split their content when enough space is available. Device rooms use a section grid. Assistant and editor reading width is capped separately.

The web app no longer displays a fictional clock, camera cutout or gesture bar. Explicit `preview` rendering retains that option. Safe-area ownership is in the screen shell rather than repeated in each scrolling page.

Home navigation resolves to the existing `/` route. The six missing classic destinations now have route files. One root-level `Overlays` host uses the existing detached Bloom BottomSheet, capped at 640 pixels; it is not a custom Modal or a second overlay per retained route. Expo Router retains ownership of native back handling.

## Scope preserved

`connect.ts`, `LoginView.tsx`, `storage.ts`, the Home Assistant bootstrap in `app/index.tsx`, optional Oxy identity and the legacy live entity/thermostat views are unchanged. The reference screens still use their existing local demo state. This PR does **not** claim that the displayed cameras, weather, assistant or device controls are bound to live services. The additional tablet tiles extend that same demo reducer only.

`@willo.sh/ui` remains app-agnostic: no frontend state, routing or bundled app assets are imported into it. Its Avatar still takes an image source from the caller.

## Verification

From the repository root:

```sh
bun install --frozen-lockfile
bun test tests
bun run typecheck
cd packages/frontend
bunx expo export --platform web
```

The added UI checks workflow runs these on pull requests. A workflow being present is not evidence that its run passed: review its actual status before merging.

Locally verified during preparation: 34 reducer, layout, route and theme-registration tests; TypeScript syntax transpilation of the candidate modules; 120 layout inspections (12 screens at 10 widths) using the offline DOM adapter, plus state retention on resize, category filtering and rendered palette checks. The adapter is **not Expo, React Native Web, or Bloom**. It does not validate Metro, NativeWind's native runtime, the real router, modal focus, or device execution. Dependency installation and real Expo execution were unavailable in the preparation environment.

Before merging, review the real app at 390, 600, 834, 1024 and 1440 logical pixels; rotate a tablet and try split view. Change a light, temperature, filter and editor draft before resizing. Visit every navigation destination, use browser/native back, and open/close a single Bloom sheet after several route changes. Check keyboard navigation, keyboard avoidance, enlarged text, safe areas and short landscape windows on supported devices.
