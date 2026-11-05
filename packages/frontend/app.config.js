/**
 * Willo: the smart home app, on the web (willo.sh), Android and iOS.
 */

// Willo's registered Oxy client id. It identifies the app to Oxy sign-in, and
// the binary's Oxy Updates manifest URL is baked from it at build time. Never a
// fallback: a binary pointed at another app's id would sign in and update as
// that app. Values: packages/frontend/.env.example and eas.json.
const OXY_CLIENT_ID = process.env.EXPO_PUBLIC_OXY_CLIENT_ID;
if (!OXY_CLIENT_ID) {
  throw new Error('EXPO_PUBLIC_OXY_CLIENT_ID is not set: see packages/frontend/.env.example.');
}

module.exports = {
  expo: {
    name: 'Willo',
    slug: 'willo',
    scheme: 'willo',
    platforms: ['ios', 'android', 'web'],
    // The OTA compatibility boundary (withOxyUpdates sets runtimeVersion policy
    // 'appVersion') and the source of the store build number (the preset
    // derives versionCode/buildNumber from it): bump it whenever the native
    // layer changes, and the next push to main releases a new binary.
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
    },
    description: 'Willo — smart home control by Oxy',
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#ffffff',
        },
      ],
      ['@oxy.so/app-preset', { android: { gifEnabled: false, webpEnabled: false } }],
      [
        'expo-camera',
        {
          cameraPermission:
            'Willo uses the camera to scan the QR code shown on your Home Assistant device when connecting it.',
        },
      ],
      [
        'react-native-audio-api',
        {
          iosMicrophonePermission: 'Willo uses the microphone so you can talk to Alia.',
          iosBackgroundMode: false,
          androidForegroundService: false,
          androidPermissions: ['android.permission.RECORD_AUDIO'],
        },
      ],
      [
        '@oxy.so/app-preset/plugin/withOxyUpdates',
        {
          clientId: OXY_CLIENT_ID,
          ...(process.env.EXPO_PUBLIC_OXY_API_URL
            ? { apiOrigin: process.env.EXPO_PUBLIC_OXY_API_URL }
            : {}),
        },
      ],
    ],
    android: {
      package: 'sh.willo.app',
      adaptiveIcon: {
        foregroundImage: './assets/icon.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      output: 'single',
    },
  },
};
