import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useTheme } from '@oxy.so/bloom/theme';
import { Label } from '@willo/ui';
import { ContentWidth } from '../layout/page-layout';
import { useHome } from '../state/home-context';
import { type Navigate } from '../data/screens';
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
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
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

/** `mm:ss`, floored — never shows a misleadingly-rounded-up "1:00" with 0.4s left. */
function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function PairingStep() {
  const { requestPairingCode, pairingCode: pairing, notify } = useHome();
  const { colors: themeColors } = useTheme();
  const [loading, setLoading] = useState(false);
  // Ticks once a second only to re-render the countdown below — the actual
  // expiry math re-reads `pairing.expiresAt`/`Date.now()` fresh every render,
  // this is just what triggers those re-renders.
  const [now, setNow] = useState(() => Date.now());

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      await requestPairingCode();
    } catch (error) {
      console.error('Failed to request a pairing code:', error);
      notify('Could not generate a pairing code. Try again.');
    } finally {
      setLoading(false);
    }
  }, [requestPairingCode, notify]);

  const expiresAtMs = pairing ? new Date(pairing.expiresAt).getTime() : null;
  const expired = expiresAtMs !== null && expiresAtMs <= now;

  // Request a code on mount ONLY if there isn't already a still-valid one —
  // `pairingCode` now lives in HomeProvider, so it survives this screen
  // remounting (navigating away and back, a web reload). Requesting a fresh
  // code unconditionally on every mount used to silently invalidate
  // whatever code the person might be mid-typing into Home Assistant, with
  // no warning at all.
  useEffect(() => {
    if (!pairing || expired) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The live countdown — ticks only while a non-expired code is showing, so
  // this doesn't run a timer forever in the background once one has expired
  // or before the first code has loaded.
  useEffect(() => {
    if (!pairing || expired) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [pairing, expired]);

  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
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
          {pairing && (
            <Label
              className={`mt-3 text-center text-[12px] ${expired ? '' : 'text-muted-foreground'}`}
              style={expired ? { color: themeColors.error } : undefined}
            >
              {expired ? 'This code has expired — generate a new one.' : `Expires in ${formatCountdown(expiresAtMs! - now)}.`}
            </Label>
          )}
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
 * person to see. Rendered by `ScreenSurface` as the `/onboarding` route's own
 * content (`app/onboarding.tsx`) — a real navigated screen, not a modal over
 * whatever the user happened to be looking at: `screen-surface.tsx` redirects
 * here whenever `setupStage` isn't `'ready'` (except from the home screen
 * itself, which shows `HomeSetupPrompt` below instead of redirecting
 * immediately — see its own doc comment for why).
 */
export function HomeSetupFlow({ header }: { header?: React.ReactNode }) {
  const { setupStage } = useHome();
  return (
    <View className="min-h-0 min-w-0 flex-1">
      {header}
      {setupStage === 'needs-pairing' ? <PairingStep /> : <CreateHomeStep />}
    </View>
  );
}

/**
 * The home screen's own inline stand-in for `HomeSetupFlow`, shown instead of
 * an immediate redirect to `/onboarding` — landing straight on a different
 * route right after sign-in reads as more abrupt than a normal screen with a
 * clear call to action. Every OTHER screen still redirects immediately
 * (`screen-surface.tsx`): there's no sensible partial content to show on
 * `/devices` or `/settings` for a Home that doesn't exist or isn't paired
 * yet, so there's nothing an inline prompt would be standing in for there.
 */
export function HomeSetupPrompt({ onNavigate }: { onNavigate: Navigate }) {
  const { setupStage } = useHome();
  const pairing = setupStage === 'needs-pairing';
  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <SignInIllustration width={160} />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">
            {pairing ? 'Connect Home Assistant' : "Let's set up your home"}
          </Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">
            {pairing
              ? 'Your home is created — pair your Home Assistant to start controlling your devices.'
              : 'Create your Willo home to start controlling your devices.'}
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pairing ? 'Continue setup' : 'Get started'}
            onPress={() => onNavigate('onboarding')}
            className="mt-6 items-center rounded-full bg-primary-subtle px-8 py-4"
          >
            <Label className="text-[14px] font-medium text-primary-text">{pairing ? 'Continue setup' : 'Get started'}</Label>
          </Pressable>
        </View>
      </ContentWidth>
    </View>
  );
}
