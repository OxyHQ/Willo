import React from 'react';
import { View } from 'react-native';
import { OxySignInButton } from '@oxy.so/services';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';
import { SignInIllustration } from './sign-in-illustration';

/**
 * The signed-out prompt itself — illustration + title + subtitle + the Oxy
 * sign-in button. Purely presentational: no auth check, no `ContentPanel`
 * wrapping of its own. `ScreenSurface` decides WHEN to render this (in place
 * of a screen's normal content) and already wraps whatever it renders in the
 * one `ContentPanel` every screen shares — this must not wrap a second one.
 */
export function SignInPrompt() {
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
