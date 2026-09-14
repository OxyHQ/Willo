import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@oxy.so/bloom/theme';
import { useAuth, OxySignInButton } from '@oxy.so/services';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';

const illustration = require('../assets/sign-in-illustration.png');
// The source PNG's own pixel ratio (2480x1776) — keeps the illustration's
// real proportions at any display width instead of a guessed one.
const ILLUSTRATION_RATIO = 2480 / 1776;

function SignedOutScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <Image source={illustration} style={{ width: '100%', aspectRatio: ILLUSTRATION_RATIO }} contentFit="contain" />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">Welcome to Willo</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">Sign in with your Oxy account to control your home.</Label>
          <OxySignInButton variant="contained" style={{ marginTop: 28, alignSelf: 'stretch' }} />
        </View>
      </ContentWidth>
    </View>
  );
}

/**
 * Gates Willo's own home UI (and the stored Home Assistant session it tries
 * to restore — see `HomeProvider`) behind an Oxy identity. Signed out or
 * still resolving, nothing below mounts: there is no point reconnecting to a
 * Home Assistant instance for a session that isn't signed in to Oxy yet.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { colors: themeColors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return (
      <View className="min-h-0 min-w-0 flex-1 items-center justify-center bg-background">
        <ActivityIndicator color={themeColors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <SignedOutScreen />;
  return <>{children}</>;
}
