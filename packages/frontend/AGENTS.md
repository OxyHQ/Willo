# Willo

Smart home control app. Connects to a user's own self-hosted Home Assistant instance; Home Assistant is never shown to the user, only Willo's own UI.

## Two unrelated auth flows — do not conflate them

- **Home Assistant auth** (`LoginView.tsx`, `connect.ts`, `storage.ts`): the app's own OAuth connection to the user's Home Assistant instance. Nothing to do with Oxy accounts.
- **Sign-in with Oxy** (`OxyProvider`/`useOxy` from `@oxy.so/services`): the user's Oxy account identity. Optional, reached from a settings screen — the app must stay fully usable via Home Assistant login with no Oxy account at all. Never gate the app behind `RequireOxyAuth`.

No `OXY_CLIENT_ID` is provisioned yet (that requires an ops deploy to `OxyHQ/oxy`, not something this repo can self-serve). `OxyProvider` runs without `clientId` — this only disables the cross-app device sign-in (QR/approval) flow, ordinary sign-in still works. Add `clientId`/`authRedirectUri` once provisioned.

## Existing custom UI stays as-is

`ThermostatView.tsx`, `components/Level.tsx`, `EntitiesView.tsx`, `styles.ts`, `colors.ts` are deliberately not migrated to Bloom/NativeWind — this hand-built look and its moti transitions are the point of the app. Use Bloom + NativeWind only for new screens (e.g. the Oxy sign-in settings screen), never retrofit them onto these files.

## Web platform gaps

`expo-secure-store` has no web implementation; `storage.ts` falls back to `localStorage` there. Home Assistant's static file serving (`/local/...`) needs `cors_allowed_origins` set in the user's own `configuration.yaml` to be reachable from the web build — this is the user's server config, not something the app can work around.
