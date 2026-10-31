# Frame by Willo (`packages/frame`)

The photo frame: one Expo app for the web (frame.willo.sh, also what a Chromecast loads) and one Android APK for phones, tablets and TVs. It signs in AS Willo with Oxy's device sign-in (a QR, no keyboard).

## Android

- **One APK for every Android screen.** `plugins/with-android-tv.js` adds the LEANBACK launcher, makes touch and leanback optional and names `assets/tv-banner.png` (320x180, xhdpi) as the TV banner. No react-native-tvos.
- **Landscape, always.** The picture turns by the frame's `rotation` setting, the same transform as on the web and on a TV that cannot rotate; never let the system rotate it as well.
- **Built on a workstation, never in CI.** Every Oxy APK is signed with the one ecosystem key, which stays offline (`~/Oxy/docs/infra-and-deploys.md#android-release-signing`): `bun run android:release` with the `ORG_GRADLE_PROJECT_OXY_UPLOAD_*` variables that page lists. The build fails unless the certificate is the ecosystem one.
- **OTA through Oxy Updates, on the `frame-production` channel of Willo's application**, so frame and Willo app bundles never reach each other. `version` in `app.config.js` is the OTA compatibility boundary: bump it (and `versionCode`) whenever the native layer changes.
