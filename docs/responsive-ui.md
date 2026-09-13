# Responsive Home UI integration

This is an in-place correction of the real frontend introduced in commit 48815f0, not another standalone demo or gallery.

## What was broken

The screens referenced `bg-home-*` and `text-home-*`, but those colors had never been registered in Tailwind 4. JavaScript color objects do not register CSS utilities. The app also retained the mobile-only layout and drew a fake phone status bar on web. Navigation targeted several routes that did not exist. Every retained screen mounted an overlay host connected to the same global sheet state.

## Changes

- `packages/ui/theme/home.css` defines the shared Home colors with `@theme`; the real frontend CSS imports it and scans layout sources.
- `frontend/layout` measures the available host. Below 600 logical pixels navigation stays at the bottom. At 600 it becomes an 80-pixel rail; at 1440 it becomes a 184-pixel sidebar. Page content is capped at 1440 pixels.
- Dashboard cards use stable IDs and measured heights. At four columns semantic lanes reproduce the tablet reference; narrower surfaces repack cards without copying screens or reparenting their controls. Font scale contributes to the minimum column width.
- All twelve screens use responsive content containers. Activity and routines split into columns; rooms and settings wrap; chat and the composer retain readable widths.
- `Tile` supports non-growing dashboard cards while preserving its existing growing-row default. The shared UI package still receives its avatar source from the app and imports no app state.
- All twelve URLs exist. Navigation uses an explicit route map rather than concatenating arbitrary strings. The obsolete gallery action is gone.
- Safe areas come from the platform. Production does not draw a fake time, camera hole or home indicator. Expo Router owns system back navigation.
- The existing Bloom detached bottom sheet remains in place, with one root overlay host instead of one per retained screen.

## Intentionally unchanged

No dependency versions, lockfile, NativeWind/Metro preset, Home Assistant OAuth, Oxy providers, storage, or legacy thermostat/light controls are replaced. Existing reference assets and local demonstration state are retained. This UI change does not connect camera video, AI answers, weather, routines or device controls to Home Assistant. `/` retains the existing connection/login flow; `/home` is the same local-state Home screen available through navigation, not an authentication implementation.

## Verification

Run the pure state, geometry and integration contracts from the repository root:

```sh
node --experimental-strip-types --test packages/frontend/tests/*.test.mjs
```

The `UI validation` workflow additionally installs the existing Bun lockfile, runs the actual workspace typecheck, exports the real Expo web app, then checks all twelve routes at 390, 834, 1024 and 1440 pixels with Chromium. It checks loaded Home colors, navigation mode, horizontal overflow, dashboard overlap and preservation of temperature/drafts across resizing. Screenshots and JSON results are uploaded as `willo-web-ui-verification`.

The workflow is a test definition, not a statement that it has passed. Check the associated run before merging. Browser verification does not replace native iOS/Android device testing, including rotation, safe areas, keyboard and large accessibility text. No HTML preview adapter is bundled with the application or used by the workflow.
