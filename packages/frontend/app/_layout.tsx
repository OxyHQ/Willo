import '../global.css';

import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { OxyProvider } from '@oxy.so/services';
import * as WebBrowser from 'expo-web-browser';

// Required by expo-auth-session: on web, this lets the popup opened for
// Home Assistant login detect that it's the redirect target, hand the
// result back to the window that opened it, and close itself.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BloomProvider>
          <OxyProvider baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}>
            <Stack screenOptions={{ headerShown: false }} />
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
