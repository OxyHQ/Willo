import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTheme } from '@oxy.so/bloom/theme';
import { ContentPanel } from '@oxy.so/bloom/content-panel';
import { useBottomEdgeInset } from '@oxy.so/bloom/layout';
import { useAuth, OxySignInButton } from '@oxy.so/services';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';
import { BREAKPOINTS } from '../layout/metrics';
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
 * needs an identity swaps for a sign-in prompt.
 *
 * The loading/signed-out states wrap themselves in the SAME `ContentPanel`
 * (`bg-card`, framed the same way, same bottom-edge inset) every real
 * screen already gets from `ScreenSurface` — otherwise this would be the
 * one screen in the app sitting on the plain page background instead of
 * the raised card surface every other screen has. Once signed in, `children`
 * is the routed `<Slot/>`/`<Stack/>`, which wraps ITSELF in that same panel
 * via `ScreenSurface` — this must not double-wrap that case.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { colors: themeColors } = useTheme();
  const { isAuthenticated, isAuthResolved } = useAuth();
  const bottomEdgeInset = useBottomEdgeInset();

  if (isAuthResolved && isAuthenticated) return <>{children}</>;

  return (
    <View className="min-h-0 min-w-0 flex-1 sm:pb-2 sm:pr-2">
      <ContentPanel framedFrom={BREAKPOINTS.rail} maskColor={themeColors.background} surfaceClassName="bg-card" contentClassName="min-h-0 min-w-0 flex-1" contentStyle={{ paddingBottom: bottomEdgeInset }}>
        {isAuthResolved ? (
          <SignedOutScreen />
        ) : (
          <View className="min-h-0 min-w-0 flex-1 items-center justify-center">
            <ActivityIndicator color={themeColors.primary} />
          </View>
        )}
      </ContentPanel>
    </View>
  );
}
