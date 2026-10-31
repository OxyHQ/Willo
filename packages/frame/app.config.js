/**
 * Frame by Willo: one Expo app for the web (frame.willo.sh, also what a
 * Chromecast loads) and one Android APK for phones, tablets and TVs.
 */

// Willo's registered Oxy client id. A frame signs in AS Willo (it is a Willo
// sub-app), and the APK's Oxy Updates manifest URL is baked from it at build
// time. Never a fallback: a binary pointed at another app's id would sign in
// and update as that app.
const OXY_CLIENT_ID = process.env.EXPO_PUBLIC_OXY_CLIENT_ID;
if (!OXY_CLIENT_ID) {
  throw new Error('EXPO_PUBLIC_OXY_CLIENT_ID is not set: see packages/frame/.env.example.');
}

// The OTA release channel this binary polls, under Willo's application. The
// frame has a channel of its own so its bundles never reach a Willo app build,
// nor Willo's reach a frame; `oxy-ship publish --channel` writes to it.
const OXY_UPDATES_CHANNEL = process.env.EXPO_PUBLIC_OXY_UPDATES_CHANNEL ?? 'frame-production';

module.exports = {
  expo: {
    name: 'Frame by Willo',
    slug: 'willo-frame',
    scheme: 'willoframe',
    platforms: ['android', 'web'],
    // The OTA compatibility boundary (withOxyUpdates sets runtimeVersion policy
    // 'appVersion'): bump it whenever the native layer changes.
    version: '1.0.0',
    // A frame is landscape like the screen it runs on; its picture turns by the
    // frame's own `rotation` setting, the same on Android, the web and a TV
    // that cannot rotate at all, so the system never turns it a second time.
    orientation: 'landscape',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    backgroundColor: '#000000',
    description: 'Frame by Willo: your photos, your home and the news on any screen',
    android: {
      package: 'sh.willo.frame',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      // A frame reads the network and keeps the screen on; nothing else.
      blockedPermissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.SYSTEM_ALERT_WINDOW',
        'android.permission.READ_EXTERNAL_STORAGE',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#000000',
          image: './assets/splash-icon.png',
          imageWidth: 240,
          resizeMode: 'contain',
        },
      ],
      ['@oxy.so/app-preset', { android: { gifEnabled: false, webpEnabled: true } }],
      // Full screen from the first frame: both system bars hidden in the theme,
      // shown again only while someone swipes from an edge.
      ['expo-status-bar', { hidden: true }],
      ['expo-navigation-bar', { hidden: true }],
      './plugins/with-android-tv',
      [
        '@oxy.so/app-preset/plugin/withOxyUpdates',
        {
          clientId: OXY_CLIENT_ID,
          channel: OXY_UPDATES_CHANNEL,
          ...(process.env.EXPO_PUBLIC_OXY_API_URL
            ? { apiOrigin: process.env.EXPO_PUBLIC_OXY_API_URL }
            : {}),
        },
      ],
    ],
    web: { bundler: 'metro', output: 'single' },
    experiments: { typedRoutes: false },
  },
};
