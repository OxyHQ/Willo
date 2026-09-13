import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { OxyProvider } from '@oxy.so/services';
import { HomeProvider } from '../state/home-context';
import { Overlays } from '../components/overlays';
import * as WebBrowser from 'expo-web-browser';

// Complete Home Assistant's existing web OAuth popup flow.
WebBrowser.maybeCompleteAuthSession();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <BloomProvider>
          <OxyProvider baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}>
            <HomeProvider>
              <StatusBar barStyle="dark-content" />
              <Stack screenOptions={{ headerShown: false }} />
              <Overlays />
            </HomeProvider>
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
