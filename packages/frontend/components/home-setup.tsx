import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useTheme } from '@oxy.so/bloom/theme';
import { Label } from '@willo.sh/ui';
import { ContentWidth } from '../layout/page-layout';
import { ClaimDeviceError, useHome, useHomeActions } from '../state/home-context';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { LOTTIE_ANIMATIONS } from '../data/lottie-animations';
import { type Navigate } from '../data/screens';
import { SignInIllustration } from './sign-in-illustration';
import { ThemedLottie } from './themed-lottie';

/**
 * A Willo appliance serves its own local status page at this fixed,
 * predictable address (its own orchestrator — see OxyHQ/Willo#9's `willo-ha`
 * repo) the moment it's on the same network, whether or not it's been
 * claimed yet. Trying this FIRST, before ever asking a person to scan or
 * type anything, is what makes "auto-detect" possible: if it's reachable
 * and reports a pending claim, there's nothing left for a human to do but
 * confirm it's the right one.
 */
const WILLO_LOCAL_STATUS_URL = 'http://willo.local/status';
const AUTO_DETECT_TIMEOUT_MS = 2500;
/** `deviceModel`, when present, is the underlying Home Assistant board's own model name (e.g. "Green", "Yellow") — Willo rebrands it as "Willo {model}" rather than assuming every appliance is the Green. */
type WilloLocalStatus = { stage: string; claimCode?: string; deviceModel?: string | null };

/** "Willo Green" for a detected Home Assistant Green, "Willo Yellow" for a Yellow, and so on — falls back to a plain "Willo device" for anything self-hosted/unbranded/not yet reported. */
function willoDeviceName(deviceModel: string | null | undefined, t: TFunction): string {
  return deviceModel ? t('onboarding.deviceName', { model: deviceModel }) : t('onboarding.genericDevice');
}

function CreateHomeStep() {
  const { createHome, notify } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      await createHome(name.trim() || undefined);
    } catch (error) {
      console.error('Failed to create a Home:', error);
      notify(t('onboarding.createFailed'));
    } finally {
      setSubmitting(false);
    }
  }, [createHome, name, notify, t]);

  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <ThemedLottie animation={LOTTIE_ANIMATIONS.createHome} className="w-[160px]" />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">{t('onboarding.setUpTitle')}</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">{t('onboarding.setUpSubtitle')}</Label>
          <TextInput
            accessibilityLabel={t('onboarding.homeName')}
            value={name}
            onChangeText={setName}
            placeholder={t('onboarding.homeNamePlaceholder')}
            placeholderTextColor={themeColors.textSecondary}
            maxLength={200}
            className="mt-6 w-full rounded-2xl bg-card px-4 py-3 text-[15px] text-foreground"
            style={{ borderCurve: 'continuous' }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.create')}
            disabled={submitting}
            onPress={onSubmit}
            className={`mt-5 items-center rounded-full bg-primary-subtle px-8 py-4 ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <Label className="text-[14px] font-medium text-primary-text">{submitting ? t('onboarding.creating') : t('onboarding.create')}</Label>
          </Pressable>
        </View>
      </ContentWidth>
    </View>
  );
}

/**
 * The DEVICE-initiated pairing path (OxyHQ/Willo#9's "Willo Local"): a Willo
 * appliance shows its OWN claim code/QR on its own screen, and this is where
 * a person confirms it — auto-detected first (see `WILLO_LOCAL_STATUS_URL`
 * above), then a native camera scan, then plain manual entry, in that order
 * of how little a person should have to do. The appliance's own detected
 * hardware model (`willoDeviceName`) drives the copy — "Willo Green" for a
 * Home Assistant Green, "Willo Yellow" for a Yellow, and so on, rather than
 * assuming every appliance is the same board. `PairingStep` below (the OLD,
 * app-shows-the-code flow) is kept as the "connect it manually" fallback via
 * `onUseManualPairing` — still the real path for someone self-hosting Home
 * Assistant and installing the `willo` HACS integration by hand, not a Willo
 * appliance.
 */
function ClaimDeviceStep({ onUseManualPairing }: { onUseManualPairing: () => void }) {
  const { claimDevice, notify } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const [mode, setMode] = useState<'detecting' | 'found' | 'manual'>('detecting');
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [detectedModel, setDetectedModel] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AUTO_DETECT_TIMEOUT_MS);
    fetch(WILLO_LOCAL_STATUS_URL, { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<WilloLocalStatus>) : null))
      .then((status) => {
        if (ignore) return;
        if (status?.stage === 'awaiting-pairing' && status.claimCode) {
          setDetectedCode(status.claimCode);
          setDetectedModel(status.deviceModel ?? null);
          setMode('found');
        } else {
          setMode('manual');
        }
      })
      .catch(() => {
        // No Willo appliance reachable at willo.local (none on this network,
        // mDNS didn't resolve, it's already paired) — not an error a person
        // needs to see, just fall straight through to manual entry.
        if (!ignore) setMode('manual');
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      ignore = true;
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  const submit = useCallback(
    async (claimCode: string) => {
      if (!claimCode.trim()) return;
      setSubmitting(true);
      try {
        await claimDevice(claimCode);
      } catch (error) {
        console.error('Failed to claim a device:', error);
        notify(error instanceof ClaimDeviceError && error.reason === 'invalid-code' ? t('onboarding.invalidCode') : t('onboarding.claimFailed'));
      } finally {
        setSubmitting(false);
      }
    },
    [claimDevice, notify, t]
  );

  const onScanned = useCallback(
    (result: BarcodeScanningResult) => {
      // Closing the scanner immediately unmounts CameraView, which is what
      // actually stops it from firing this callback again for the same
      // still-visible code on the next frame.
      setScannerOpen(false);
      submit(result.data);
    },
    [submit]
  );

  const onScanPress = useCallback(async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        notify(t('onboarding.cameraNeeded'));
        return;
      }
    }
    setScannerOpen(true);
  }, [permission, requestPermission, notify, t]);

  if (scannerOpen) {
    return (
      <View className="min-h-0 min-w-0 flex-1">
        <CameraView style={{ flex: 1 }} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={onScanned} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.cancelScanning')}
          onPress={() => setScannerOpen(false)}
          className="absolute bottom-10 left-0 right-0 mx-auto w-40 cursor-pointer items-center rounded-full bg-card px-6 py-3"
        >
          <Label className="text-[14px] font-medium">{t('onboarding.cancel')}</Label>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <ThemedLottie animation={LOTTIE_ANIMATIONS.connectHomeAssistant} className="w-[160px]" />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">{t('onboarding.connectTitle')}</Label>

          {mode === 'detecting' && (
            <>
              <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">{t('onboarding.detecting')}</Label>
              <ActivityIndicator className="mt-6" color={themeColors.primary} />
            </>
          )}

          {mode === 'found' && detectedCode && (
            <>
              <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">{t('onboarding.found', { device: willoDeviceName(detectedModel, t) })}</Label>
              <View className="mt-6 min-h-[76px] min-w-[220px] items-center justify-center rounded-2xl bg-card px-8 py-5">
                <Label selectable className="text-center text-[32px] font-medium" style={{ letterSpacing: 6 }}>{detectedCode}</Label>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.connectThis', { device: willoDeviceName(detectedModel, t) })}
                disabled={submitting}
                onPress={() => submit(detectedCode)}
                className={`mt-5 items-center rounded-full bg-primary-subtle px-8 py-4 ${submitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <Label className="text-[14px] font-medium text-primary-text">{submitting ? t('onboarding.connecting') : t('onboarding.connect')}</Label>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.enterManually')} onPress={() => setMode('manual')} className="mt-4 cursor-pointer">
                <Label className="text-[12px] text-muted-foreground">{t('onboarding.notTheRightOne')}</Label>
              </Pressable>
            </>
          )}

          {mode === 'manual' && (
            <>
              <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">
                {Platform.OS === 'web'
                  ? t('onboarding.enterCodeWeb')
                  : t('onboarding.scanOrEnter')}
              </Label>
              {/* Scanning is a native-only affordance — a desktop/web browser
                  has no reliable, universally-available camera-scan UX the
                  way a phone does, so web goes straight to typing the code. */}
              {Platform.OS !== 'web' && (
                <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.scanQr')} onPress={onScanPress} className="mt-6 cursor-pointer items-center rounded-full bg-primary-subtle px-8 py-4">
                  <Label className="text-[14px] font-medium text-primary-text">{t('onboarding.scanQr')}</Label>
                </Pressable>
              )}
              <TextInput
                accessibilityLabel={t('onboarding.deviceCode')}
                value={code}
                onChangeText={(text) => setCode(text.toUpperCase())}
                placeholder={t('onboarding.deviceCodePlaceholder')}
                placeholderTextColor={themeColors.textSecondary}
                autoCapitalize="characters"
                maxLength={8}
                className="mt-4 w-full rounded-2xl bg-card px-4 py-3 text-center text-[18px] text-foreground"
                style={{ borderCurve: 'continuous', letterSpacing: 4 }}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('onboarding.connectWithCode')}
                disabled={submitting || code.trim().length === 0}
                onPress={() => submit(code)}
                className={`mt-4 items-center rounded-full bg-primary-subtle px-8 py-4 ${submitting || code.trim().length === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <Label className="text-[14px] font-medium text-primary-text">{submitting ? t('onboarding.connecting') : t('onboarding.connect')}</Label>
              </Pressable>
            </>
          )}

          <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.manualPairingLabel')} onPress={onUseManualPairing} className="mt-8 cursor-pointer">
            <Label className="text-[12px] text-muted-foreground">{t('onboarding.manualPairing')}</Label>
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

/** The OLD, app-shows-the-code flow — kept as `ClaimDeviceStep`'s "connect manually" fallback, still the real path for a self-hosted Home Assistant + the `willo` HACS integration installed by hand. */
function PairingStep({ onBack }: { onBack: () => void }) {
  const { pairingCode: pairing } = useHome();
  const { requestPairingCode, notify } = useHomeActions();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
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
      notify(t('onboarding.pairingFailed'));
    } finally {
      setLoading(false);
    }
  }, [requestPairingCode, notify, t]);

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
          <ThemedLottie animation={LOTTIE_ANIMATIONS.connectHomeAssistant} className="w-[160px]" />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">{t('onboarding.connectTitle')}</Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">{t('onboarding.pairingInstructions')}</Label>
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
              {expired ? t('onboarding.codeExpired') : t('onboarding.expiresIn', { time: formatCountdown(expiresAtMs! - now) })}
            </Label>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.newCodeLabel')}
            disabled={loading}
            onPress={generate}
            className={`mt-5 items-center rounded-full bg-primary-subtle px-6 py-3 ${loading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
          >
            <Label className="text-[13px] font-medium text-primary-text">{t('onboarding.newCode')}</Label>
          </Pressable>
          <View className="mt-8 flex-row items-center gap-2">
            <ActivityIndicator size="small" color={themeColors.textSecondary} />
            <Label className="text-[12px] text-muted-foreground">{t('onboarding.waiting')}</Label>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={t('onboarding.backLabel')} onPress={onBack} className="mt-6 cursor-pointer">
            <Label className="text-[12px] text-muted-foreground">{t('onboarding.back')}</Label>
          </Pressable>
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
  // Resets to the primary (device-claim) path every time this Home isn't
  // paired yet — a `key` on the pairing branch, not global state, so it
  // never leaks a "manual" choice from a PREVIOUS Home into a new one.
  const [manual, setManual] = useState(false);
  return (
    <View className="min-h-0 min-w-0 flex-1">
      {header}
      {setupStage === 'needs-pairing' ? (
        manual ? <PairingStep onBack={() => setManual(false)} /> : <ClaimDeviceStep onUseManualPairing={() => setManual(true)} />
      ) : (
        <CreateHomeStep />
      )}
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
  const { t } = useTranslation();
  const pairing = setupStage === 'needs-pairing';
  return (
    <View className="min-h-0 min-w-0 flex-1 items-center justify-center px-6">
      <ContentWidth maxWidth={420} padding={false}>
        <View className="items-center">
          <SignInIllustration width={160} />
          <Label className="mt-8 text-center text-[23px] font-medium leading-[29px]">
            {pairing ? t('onboarding.connectTitle') : t('onboarding.setUpTitle')}
          </Label>
          <Label className="mt-2 text-center text-[14px] leading-[20px] text-muted-foreground">
            {pairing ? t('onboarding.promptPairingSubtitle') : t('onboarding.promptCreateSubtitle')}
          </Label>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={pairing ? t('onboarding.continueSetup') : t('onboarding.getStarted')}
            onPress={() => onNavigate('onboarding')}
            className="mt-6 items-center rounded-full bg-primary-subtle px-8 py-4"
          >
            <Label className="text-[14px] font-medium text-primary-text">{pairing ? t('onboarding.continueSetup') : t('onboarding.getStarted')}</Label>
          </Pressable>
        </View>
      </ContentWidth>
    </View>
  );
}
