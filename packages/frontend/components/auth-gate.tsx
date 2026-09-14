import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@oxy.so/bloom/theme';
import { useAuth, OxySignInButton } from '@oxy.so/services';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';
import { SignInIllustration } from './sign-in-illustration';

function SignedOutScreen() {
  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <SignInIllustration width={200} />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">Welcome to Willo</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">Sign in with your Oxy account to control your home.</Label>
          <OxySignInButton variant="contained" style={{ marginTop: 28 }} />
        </View>
      </ContentWidth>
    </View>
  );
}

/**
 * Gates Willo's own routed content (and the stored Home Assistant session
 * `app/index.tsx` tries to restore) behind an Oxy identity — see
 * `app/_layout.tsx`, which wraps only the routed `<Slot/>`/`<Stack/>` in
 * this, not the nav rail or bottom tabs: Willo's own chrome stays on
 * screen whether or not you're signed in, only the part that actually
 * needs an identity swaps for a sign-in prompt. No background class here
 * either — the `screen-surface` container this renders inside already
 * paints `bg-background`.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { colors: themeColors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();

  if (!isAuthResolved) {
    return (
      <View className="min-h-0 min-w-0 flex-1 items-center justify-center">
        <ActivityIndicator color={themeColors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <SignedOutScreen />;
  return <>{children}</>;
}
