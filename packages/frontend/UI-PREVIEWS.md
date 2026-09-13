# Willo interface previews

A UI-only recreation of the supplied current and classic home-app references. The existing app entry point, Home Assistant connection, Oxy identity providers, custom thermostat, light sheet, and entity controls are unchanged.

## Open the screens

Use the existing workspace and dependencies. From the repository root:

```sh
bun install --frozen-lockfile
cd packages/frontend
bun run web
```

Open `/ui` on the local web server. For native, run `bun run start` and open the `ui` route through Expo Router. The route uses the existing root providers; it does not require a Home Assistant connection or add an Oxy sign-in gate.

| Path | Reference |
| --- | --- |
| `/ui/home` | Current home: search header, favorite filters, camera, lock/light tiles, thermostat, weather and air quality |
| `/ui/activity` | Current activity: home brief, feedback, filters and event cards |
| `/ui/automations` | Current automations: upcoming cards and automation list |
| `/ui/favorites` | Classic favorites: categories, broadcast/assistant, garden camera, device tiles, five-tab navigation |
| `/ui/devices` | Devices grouped by room |
| `/ui/routines` | Classic household and personal routines |
| `/ui/activity-classic` | Classic compact event timeline |
| `/ui/settings` | Home details, members, device/service tiles and home features |
| `/ui/ask` | Sample home conversation and camera-event results |
| `/ui/emergency` | Sample smoke alert, camera carousel and alarm-status cards |
| `/ui/create-automation` | Natural-language automation editor and suggestion chips |

Every preview includes an “All screens” link. Unknown preview paths show a recoverable empty state. Current and classic navigation are kept separate instead of mixing the two references into one design.

## Implementation

Reusable screens and UI components live in `components/home-ui/`. The only navigation dependency in a screen is the typed `onNavigate` callback; the Expo Router adapter lives in `app/ui/`. Screen components can be imported individually without the gallery or its preview banner.

Styling uses the repository's existing NativeWind 5 / Tailwind 4 setup. The appended `--color-willo-*` theme tokens are namespaced; no existing Bloom tokens are replaced. Third-party Expo Image styling uses NativeWind's `styled` adapter. All new static layout styling uses classes. Inline values are limited to measured safe-area insets and runtime brightness percentages.

The previews include local visual interactions: device switches, bounded temperature stepping, camera mute state, routine-play feedback, dismissible upcoming cards, event/device/date filters with an empty state, expandable briefs, feedback selection, suggestion chips and text entry. These do not implement home control, audio, inference, recording playback, scheduling or persistence. Navigating between previews resets local screen state.

Only installed dependencies are used. `package.json`, `bun.lock`, Metro/Babel configuration, authentication, connection code and the existing application route are not changed.

## Sample content and images

`fixtures.ts` contains reference-only sample home data, names, address, dates, weather, device states, conversation text and activity. None of this describes the signed-in user or a real home.

`assets/ui-preview/living-room.webp` and `garden.webp` are compressed camera-area crops from the user-supplied visual references. They are illustrative thumbnails, not streams or evidence of the events described in the sample conversation. They are isolated preview assets; replace them with appropriately licensed or app-owned images before reusing them in production. No Google/Nest logos, proprietary fonts or service integrations are included.

## Verification status

Checked in the authoring environment:

- TS/TSX syntax transpilation for every new source file.
- Local module references, preview routes, namespaced color references and required assets.
- Scope audit: no backend, network, auth, storage, permission or device-control calls in the new UI module.

Not run in the authoring environment: the repository's dependency-aware typecheck, Metro export, or native/browser runtime tests. Repository dependencies could not be installed there because outbound DNS/network access was unavailable. Syntax checking is not a substitute for these checks.

Before merging, run `bun run typecheck` from `packages/frontend`, start the app, and check all eleven gallery links. Check phone widths of 320/390/430, larger text, keyboard behavior, tab navigation, modal dismissal, filters/empty state, local controls and image loading on iOS, Android and web. Verify `/` still opens the unchanged existing app.
