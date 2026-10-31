/**
 * Expo Config Plugin: withAndroidTv (Frame by Willo)
 *
 * One APK for a phone, a tablet and a TV. Android TV lists only apps whose
 * launcher activity has the LEANBACK_LAUNCHER category and that do not require
 * a touchscreen, and draws each one in its home row by the application's
 * 320x180 banner. So this plugin:
 *
 * - declares `android.software.leanback` and `android.hardware.touchscreen`
 *   as features the app can use but does not require, so Google Play offers it
 *   to TVs and phones alike;
 * - adds LEANBACK_LAUNCHER next to LAUNCHER on the main activity;
 * - copies `assets/tv-banner.png` (320x180, an xhdpi resource as Android TV asks)
 *   into the app's drawables and names it as the
 *   application's banner.
 *
 * The frame needs nothing from react-native-tvos: it has no focus-driven
 * navigation beyond the home picker, whose buttons the D-pad already reaches.
 */
const fs = require('node:fs');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const BANNER_SOURCE = 'assets/tv-banner.png';
const BANNER_RESOURCE = 'tv_banner';
const LEANBACK_LAUNCHER = 'android.intent.category.LEANBACK_LAUNCHER';
const OPTIONAL_FEATURES = ['android.software.leanback', 'android.hardware.touchscreen'];

function addOptionalFeatures(manifest) {
  manifest['uses-feature'] = manifest['uses-feature'] ?? [];
  for (const feature of OPTIONAL_FEATURES) {
    const existing = manifest['uses-feature'].find((entry) => entry.$['android:name'] === feature);
    if (existing) existing.$['android:required'] = 'false';
    else
      manifest['uses-feature'].push({
        $: { 'android:name': feature, 'android:required': 'false' },
      });
  }
}

function addLeanbackLauncher(application) {
  const launcherFilters = (application.activity ?? []).flatMap((activity) =>
    (activity['intent-filter'] ?? []).filter((filter) =>
      (filter.category ?? []).some(
        (category) => category.$['android:name'] === 'android.intent.category.LAUNCHER',
      ),
    ),
  );
  if (launcherFilters.length === 0) {
    throw new Error('withAndroidTv: AndroidManifest has no LAUNCHER activity');
  }
  for (const filter of launcherFilters) {
    if (!filter.category.some((category) => category.$['android:name'] === LEANBACK_LAUNCHER)) {
      filter.category.push({ $: { 'android:name': LEANBACK_LAUNCHER } });
    }
  }
}

module.exports = function withAndroidTv(config) {
  config = withAndroidManifest(config, (modConfig) => {
    const manifest = modConfig.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      throw new Error('withAndroidTv: AndroidManifest has no <application>');
    }
    addOptionalFeatures(manifest);
    addLeanbackLauncher(application);
    application.$['android:banner'] = `@drawable/${BANNER_RESOURCE}`;
    return modConfig;
  });

  return withDangerousMod(config, [
    'android',
    (modConfig) => {
      const source = path.join(modConfig.modRequest.projectRoot, BANNER_SOURCE);
      if (!fs.existsSync(source)) {
        throw new Error(`withAndroidTv: ${BANNER_SOURCE} is missing`);
      }
      const drawables = path.join(
        modConfig.modRequest.platformProjectRoot,
        'app/src/main/res/drawable-xhdpi',
      );
      fs.mkdirSync(drawables, { recursive: true });
      fs.copyFileSync(source, path.join(drawables, `${BANNER_RESOURCE}.png`));
      return modConfig;
    },
  ]);
};
