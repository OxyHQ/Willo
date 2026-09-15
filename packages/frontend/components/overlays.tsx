import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@oxy.so/bloom/bottom-sheet';
import { assets } from '../data/assets';
import { useHome, type Sheet } from '../state/home-context';
import { getCapability, type Device } from '../providers/types';
import { colors, Icon, IconButton, Label, type IconName } from '@willo.sh/ui';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';

// The tone (yellow, blue) and icon a generic on/off-and-adjustable device
// renders with, chosen from its domain — the same domain the provider tags
// every device with, never guessed from which capabilities happen to be
// present.
const DEVICE_APPEARANCE: Record<string, { icon: IconName; tone: 'yellow' | 'blue' }> = {
  light: { icon: 'light', tone: 'yellow' },
  fan: { icon: 'fan', tone: 'blue' },
};

/** One host in the root layout, not one modal per retained router screen. */
export function Overlays() {
  const { state, dispatch, sheet, setSheet, toast, devices, sendCommand, getAuthHeaders, setupStage, tunnelConnected } = useHome();
  const { colors: themeColors } = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetRef>(null);
  // Retain content until Bloom finishes the dismissal animation.
  const [shown, setShown] = useState<Sheet>(null);
  // Re-resolve against the live list so on-off/brightness/speed track
  // real-world changes (another app, a physical switch) while the sheet
  // stays open.
  const liveDevice: Device | null =
    shown?.kind === 'realDevice' ? devices.find(device => device.id === shown.device.id) ?? shown.device : null;

  useEffect(() => {
    if (sheet) {
      setShown(sheet);
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [sheet]);

  return (
    <>
      <BottomSheet ref={sheetRef} detached style={{ maxWidth: 640 }} onDismiss={() => setSheet(null)}>
        {shown && (
          <>
            <View className="mb-3 flex-row items-center">
              <Label className="min-w-0 flex-1 text-[21px] leading-[27px]">{shown.title}</Label>
              <IconButton icon="close" label={t('sheets.close')} onPress={() => setSheet(null)} size={20} />
            </View>
            {shown.kind === 'menu' && (
              <>
                {shown.description && <Label className="mb-3 text-[12px] leading-[18px] text-muted-foreground">{shown.description}</Label>}
                {/* Index in the key: labels aren't unique (two Homes can share a name, or both be "Unnamed home"). */}
                {shown.options.map((option, index) => (
                  <Pressable key={`${index}-${option.label}`} accessibilityRole="button" accessibilityState={{ selected: option.selected }}
                    onPress={option.onPress}
                    className={`mb-2 min-h-[53px] flex-row items-center gap-3 rounded-[18px] px-4 py-3 ${option.selected ? 'bg-primary-subtle' : 'bg-muted'}`}>
                    <View className="min-w-0 flex-1">
                      <Label className="text-[14px]">{option.label}</Label>
                      {option.description && <Label className="mt-1 text-[11px] text-muted-foreground">{option.description}</Label>}
                    </View>
                    {option.selected && <Icon name="check" size={18} color={themeColors.primary} />}
                  </Pressable>
                ))}
              </>
            )}
            {shown.kind === 'message' && <Label selectable className="pb-3 text-[14px] leading-[23px] text-muted-foreground">{shown.description}</Label>}
            {shown.kind === 'camera' && (
              <>
                <View className="h-[220px] overflow-hidden rounded-[25px]">
                  <Image
                    source={shown.snapshotUrl ? { uri: shown.snapshotUrl, headers: getAuthHeaders() } : shown.garden ? assets.garden : assets.livingRoom}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
                <Label className="mt-4 text-[12px] leading-[18px] text-muted-foreground">
                  {shown.snapshotUrl !== undefined ? t('sheets.liveSnapshot') : t('sheets.staticImage')}
                </Label>
              </>
            )}
            {shown.kind === 'device' && (
              <View className="gap-5">
                <View className="h-[140px] items-center justify-center rounded-[25px] bg-secondary-subtle">
                  <Icon name="light" size={34} color={themeColors.secondary} filled />
                  <Label className="mt-3 text-[32px] text-secondary-text">{state.devices[shown.id] ? (state.brightness[shown.id] ?? 50) : 0}%</Label>
                </View>
                <Slider accessibilityLabel={t('sheets.brightnessOf', { name: shown.title })} minimumValue={0} maximumValue={100} step={1}
                  value={state.devices[shown.id] ? (state.brightness[shown.id] ?? 50) : 0}
                  onValueChange={value => dispatch({ type: 'SET_BRIGHTNESS', id: shown.id, value })}
                  minimumTrackTintColor={themeColors.secondary} maximumTrackTintColor={themeColors.backgroundSecondary} thumbTintColor={themeColors.secondary} />
                <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: shown.id })}
                  className="items-center rounded-full bg-primary-subtle py-4">
                  <Label className="text-[14px] font-medium text-primary-text">{state.devices[shown.id] ? t('sheets.turnOff') : t('sheets.turnOn')}</Label>
                </Pressable>
                <Label className="text-center text-[11px] text-muted-foreground">{t('sheets.demoSessionOnly')}</Label>
              </View>
            )}
            {shown.kind === 'realDevice' && liveDevice && (() => {
              const onOff = getCapability(liveDevice, 'onOff');
              const brightness = getCapability(liveDevice, 'brightness');
              const fanSpeed = getCapability(liveDevice, 'fanSpeed');
              const percent = brightness?.percent ?? fanSpeed?.percent ?? null;
              const appearance = DEVICE_APPEARANCE[liveDevice.domain] ?? DEVICE_APPEARANCE.light;
              // Both tones are migrated to Bloom's theme now (`tokens.ts`).
              // A NativeWind class, not `appearance.color` as an inline
              // `backgroundColor` — Bloom's own `-subtle` tints are only
              // exposed as real CSS-variable-backed classes, not JS values
              // (`ThemeColors` only carries a full `*Subtle`/`*SubtleForeground`
              // pair for `primary` and the status colors, not `secondary`).
              // `onColor` (the ICON's own fill, and the slider's track/thumb
              // further below — real component props with no class
              // equivalent) still needs the live JS value directly.
              const subtleBgClassName = appearance.tone === 'yellow' ? 'bg-secondary-subtle' : 'bg-info-subtle';
              const onColor = appearance.tone === 'yellow' ? themeColors.secondary : themeColors.info;
              const on = onOff?.on ?? false;
              return (
                <View className="gap-5">
                  <View className={`h-[140px] items-center justify-center rounded-[25px] ${on ? subtleBgClassName : 'bg-muted'}`}>
                    <Icon name={appearance.icon} size={34} color={on ? '#ffffff' : themeColors.textSecondary} filled={on} />
                    <Label className={`mt-3 text-[32px] ${on ? 'text-white' : 'text-foreground'}`}>
                      {on ? (percent != null ? `${percent}%` : t('deviceState.on')) : t('deviceState.off')}
                    </Label>
                  </View>
                  {percent != null && (
                    <Slider
                      accessibilityLabel={brightness ? t('sheets.brightnessOf', { name: liveDevice.name }) : t('sheets.speedOf', { name: liveDevice.name })}
                      minimumValue={1}
                      maximumValue={100}
                      step={1}
                      value={percent}
                      onSlidingComplete={value =>
                        sendCommand(liveDevice.id, brightness ? { kind: 'setBrightness', percent: value } : { kind: 'setFanSpeed', percent: value })
                      }
                      minimumTrackTintColor={onColor}
                      maximumTrackTintColor={themeColors.backgroundSecondary}
                      thumbTintColor={onColor}
                    />
                  )}
                  {onOff && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => sendCommand(liveDevice.id, { kind: 'setOnOff', on: !on })}
                      className="items-center rounded-full bg-primary-subtle py-4"
                    >
                      <Label className="text-[14px] font-medium text-primary-text">{on ? t('sheets.turnOff') : t('sheets.turnOn')}</Label>
                    </Pressable>
                  )}
                </View>
              );
            })()}
          </>
        )}
      </BottomSheet>
      {!!toast && !sheet && (
        <View pointerEvents="none" accessibilityLiveRegion="polite"
          className="absolute z-40 items-center self-center rounded-[18px] bg-home-ink px-4 py-3"
          style={{ bottom: width < 600 ? 88 : 24, width: Math.min(560, Math.max(0, width - 40)) }}>
          <Label className="text-center text-[12px] leading-[18px] text-white">{toast}</Label>
        </View>
      )}
      {/* A paired Home whose live tunnel just isn't up right now (a backend
          restart, the Home Assistant integration itself restarting) is NOT
          the "enter this code" onboarding case — `setupStage` stays `ready`
          for exactly this reason (see `home-context.tsx`'s doc comment) — but
          it's still worth surfacing, since devices are showing stale/last-
          known state rather than live. A top banner rather than another
          `toast` call: this can persist far longer than a toast's 2.7s, and
          reappearing on every reconnect attempt would otherwise spam it. */}
      {setupStage === 'ready' && !tunnelConnected && (
        <View pointerEvents="none" accessibilityLiveRegion="polite"
          className="absolute left-0 right-0 top-0 z-40 items-center px-4 pt-3">
          <View className="items-center rounded-full bg-home-ink px-4 py-2">
            <Label className="text-center text-[12px] leading-[16px] text-white">{t('sheets.reconnecting')}</Label>
          </View>
        </View>
      )}
    </>
  );
}
