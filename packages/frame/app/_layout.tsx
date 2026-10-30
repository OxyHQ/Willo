import '../global.css';
import i18n, { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';

import { Stack } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BloomProvider } from '@oxy.so/bloom/provider';
import { OxyProvider, useOxy } from '@oxy.so/services/ui/client';
import { useThemeSeeds } from '../lib/theme-seeds';

/**
 * The root Stack is the one authority for `(auth)` ↔ `(app)`, keyed on the
 * session alone: until cold boot resolves the frame shows its sign-in code,
 * once it has a session it shows the frame. `preview` sits outside both: a
 * sample frame anyone can open, with no account behind it.
 */
function AuthRouter() {
  const { isAuthenticated, isAuthResolved } = useOxy();
  const needsAuth = isAuthResolved ? !isAuthenticated : true;
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Protected guard={!needsAuth}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={needsAuth}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Screen name="preview" />
    </Stack>
  );
}

export default function RootLayout() {
  // A frame never sleeps: the screen stays on for as long as the app is open.
  useKeepAwake();
  const [seed, secondaryColor, tertiaryColor] = useThemeSeeds();
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Dark, and themed from the photo on screen (`lib/theme-seeds.ts`).
            Reduced transparency: cards over a moving photo paint an opaque body
            instead of blurring it; on a Chromecast that is 16 frames a second
            instead of 7. */}
        <BloomProvider
          mode="dark"
          reduceTransparency
          seed={seed}
          secondaryColor={secondaryColor}
          tertiaryColor={tertiaryColor}
        >
          <OxyProvider
            baseURL={process.env.EXPO_PUBLIC_OXY_API_URL}
            clientId={process.env.EXPO_PUBLIC_OXY_CLIENT_ID}
            authRedirectUri={process.env.EXPO_PUBLIC_OXY_AUTH_REDIRECT_URI}
            language={{
              supportedLocales: SUPPORTED_LANGUAGES,
              fallbackLocale: DEFAULT_LANGUAGE,
              onChange: async (locale) => {
                await i18n.changeLanguage(locale);
              },
              onError: (error, locale) =>
                console.error(`Failed to switch the frame's language to ${locale}:`, error),
            }}
          >
            <AuthRouter />
          </OxyProvider>
        </BloomProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
