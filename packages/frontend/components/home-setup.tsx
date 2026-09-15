import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { Dialog } from '@oxy.so/bloom/dialog';
import { useTheme } from '@oxy.so/bloom/theme';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';
import { useHome } from '../state/home-context';
import { SignInIllustration } from './sign-in-illustration';

function CreateHomeStep() {
  const { createHome, notify } = useHome();
  const { colors: themeColors } = useTheme();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await createHome(name.trim() || undefined);
    } catch (error) {
      console.error('Failed to create a Home:', error);
      notify('Could not create your home. Try again.');
    } finally {
      setSubmitting(false);
    }
  }, [createHome, name, notify]);

  return (
    <View className="items-center px-6 py-2">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <SignInIllustration width={160} />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">Let's set up your home</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">Give your home a name — you can change it later.</Label>
          <TextInput
            accessibilityLabel="Home name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. My home"
            placeholderTextColor={themeColors.textSecondary}
            maxLength={200}
            className="mt-6 w-full rounded-2xl bg-card px-4 py-3 text-[15px] text-foreground"
            style={{ borderCurve: 'continuous' }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create my home"
            disabled={submitting}
            onPress={onSubmit}
            className={`mt-5 items-center rounded-full bg-primary-subtle px-8 py-4 ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <Label className="text-[14px] font-medium text-primary-text">{submitting ? 'Creating…' : 'Create my home'}</Label>
          </Pressable>
        </View>
      </ContentWidth>
    </View>
  );
}

function PairingStep() {
  const { requestPairingCode, notify } = useHome();
  const { colors: themeColors } = useTheme();
  const [pairing, setPairing] = useState<{ code: string; expiresAt: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      setPairing(await requestPairingCode());
    } catch (error) {
      console.error('Failed to request a pairing code:', error);
      notify('Could not generate a pairing code. Try again.');
    } finally {
      setLoading(false);
    }
  }, [requestPairingCode, notify]);

  // Only on mount — after that, a fresh code is requested only when the
  // user explicitly presses "Generate a new code" below.
  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View className="items-center px-6 py-2">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <SignInIllustration width={160} />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">Connect Home Assistant</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">Open the Willo integration on your Home Assistant and enter this code.</Label>
          <View className="mt-6 min-h-[76px] min-w-[220px] items-center justify-center rounded-2xl bg-card px-8 py-5">
            {pairing ? (
              <Label selectable className="text-center text-[32px] font-medium" style={{ letterSpacing: 6 }}>{pairing.code}</Label>
            ) : (
              <ActivityIndicator color={themeColors.primary} />
            )}
          </View>
          <Label className="mt-3 text-center text-[12px] text-muted-foreground">This code expires in 15 minutes.</Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Generate a new pairing code"
            disabled={loading}
            onPress={generate}
            className={`mt-5 items-center rounded-full bg-primary-subtle px-6 py-3 ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <Label className="text-[13px] font-medium text-primary-text">Generate a new code</Label>
          </Pressable>
          <View className="mt-8 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={themeColors.textSecondary} />
            <Label className="text-[12px] text-muted-foreground">Waiting for your Home Assistant to connect…</Label>
          </View>
        </View>
      </ContentWidth>
    </View>
  );
}

/**
 * Replaces the old `LoginView` (a Home Assistant instance URL + OAuth form)
 * entirely — there is no URL, no "Advanced" toggle, and no OAuth left for a
 * person to see. `ScreenSurface` renders this in place of a screen's normal
 * content whenever `useHome()`'s `setupStage` isn't `'ready'` yet, inside
 * the same `ContentPanel` every real screen already gets — so the sidebar
 * and header stay visible underneath while this renders as a real Bloom
 * `Dialog` on top (bottom sheet on mobile, centered on desktop), not as
 * flat panel content.
 *
 * `dismissOnBackdrop={false}` (which also disables Escape — see Bloom's
 * `Dialog.web.tsx`) and no `actions`/close button: setup is mandatory, there
 * is no home to show underneath yet, so there is no legitimate way to
 * dismiss this short of finishing it.
 */
export function HomeSetupFlow() {
  const { setupStage } = useHome();
  return (
    <Dialog
      open={setupStage !== 'ready'}
      onClose={() => {}}
      dismissOnBackdrop={false}
      placement={{ base: 'bottom', md: 'center' }}
      contentPadding={0}
      label="Set up your home"
    >
      {setupStage === 'needs-pairing' ? <PairingStep /> : <CreateHomeStep />}
    </Dialog>
  );
}
