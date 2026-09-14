import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@oxy.so/bloom/bottom-sheet';
import { assets } from '../data/assets';
import { useHome, type Sheet } from '../state/home-context';
import { getCapability, type Device } from '../providers/types';
import { colors, Icon, IconButton, Label, type IconName } from '@willo/ui';
import { useTheme } from '@oxy.so/bloom/theme';

// The tone (yellow, blue) and icon a generic on/off-and-adjustable device
// renders with, chosen from its domain — the same domain the provider tags
// every device with, never guessed from which capabilities happen to be
// present.
const DEVICE_APPEARANCE: Record<string, { icon: IconName; tone: 'yellow' | 'blue'; color: string; onColor: string; offColor: string }> = {
  light: { icon: 'light', tone: 'yellow', color: colors.yellow, onColor: colors.onYellow, offColor: colors.surface },
  fan: { icon: 'fan', tone: 'blue', color: colors.blue, onColor: colors.onBlue, offColor: colors.surface },
};

/** One host in the root layout, not one modal per retained router screen. */
export function Overlays() {
  const { state, dispatch, sheet, setSheet, toast, devices, sendCommand } = useHome();
  const { colors: themeColors } = useTheme();
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
              <IconButton icon="close" label="Close details" onPress={() => setSheet(null)} size={20} />
            </View>
            {shown.kind === 'menu' && (
              <>
                {shown.description && <Label className="mb-3 text-[12px] leading-[18px] text-muted-foreground">{shown.description}</Label>}
                {shown.options.map(option => (
                  <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: option.selected }}
                    onPress={option.onPress}
                    className={`mb-2 min-h-[53px] flex-row items-center gap-3 rounded-[18px] px-4 py-3 ${option.selected ? 'bg-primary-subtle' : 'bg-home-surface'}`}>
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
                    source={shown.snapshotUrl ? { uri: shown.snapshotUrl } : shown.garden ? assets.garden : assets.livingRoom}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                  />
                </View>
                <Label className="mt-4 text-[12px] leading-[18px] text-muted-foreground">
                  {shown.snapshotUrl !== undefined ? 'Live snapshot from Home Assistant.' : 'Static reference image. No live video or audio stream is connected.'}
                </Label>
              </>
            )}
            {shown.kind === 'device' && (
              <View className="gap-5">
                <View className="h-[140px] items-center justify-center rounded-[25px] bg-home-yellow">
                  <Icon name="light" size={34} color={colors.onYellow} filled />
                  <Label className="mt-3 text-[32px] text-home-on-yellow">{state.devices[shown.id] ? (state.brightness[shown.id] ?? 50) : 0}%</Label>
                </View>
                <Slider accessibilityLabel={`${shown.title} brightness`} minimumValue={0} maximumValue={100} step={1}
                  value={state.devices[shown.id] ? (state.brightness[shown.id] ?? 50) : 0}
                  onValueChange={value => dispatch({ type: 'SET_BRIGHTNESS', id: shown.id, value })}
                  minimumTrackTintColor={colors.onYellow} maximumTrackTintColor={colors.yellow} thumbTintColor={colors.onYellow} />
                <Pressable accessibilityRole="button" onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: shown.id })}
                  className="items-center rounded-full bg-primary-subtle py-4">
                  <Label className="text-[14px] font-medium text-primary-text">Turn {state.devices[shown.id] ? 'off' : 'on'}</Label>
                </Pressable>
                <Label className="text-center text-[11px] text-muted-foreground">Changes affect this demo session only.</Label>
              </View>
            )}
            {shown.kind === 'realDevice' && liveDevice && (() => {
              const onOff = getCapability(liveDevice, 'onOff');
              const brightness = getCapability(liveDevice, 'brightness');
              const fanSpeed = getCapability(liveDevice, 'fanSpeed');
              const percent = brightness?.percent ?? fanSpeed?.percent ?? null;
              const baseAppearance = DEVICE_APPEARANCE[liveDevice.domain] ?? DEVICE_APPEARANCE.light;
              // `blue` is the one tone migrated to Bloom's theme so far
              // (`tokens.ts`) — same reasoning as `Tile`'s `migratedToneColor`:
              // `color`/`onColor` are plain inline values (no CSS variable),
              // so they need the live theme value directly instead of staying
              // the static brand hex regardless of mode.
              const appearance = baseAppearance.tone === 'blue'
                ? { ...baseAppearance, color: themeColors.infoSubtle, onColor: themeColors.info }
                : baseAppearance;
              const on = onOff?.on ?? false;
              return (
                <View className="gap-5">
                  <View
                    className="h-[140px] items-center justify-center rounded-[25px]"
                    style={{ backgroundColor: on ? appearance.color : appearance.offColor }}
                  >
                    <Icon name={appearance.icon} size={34} color={on ? '#ffffff' : themeColors.textSecondary} filled={on} />
                    <Label className={`mt-3 text-[32px] ${on ? 'text-white' : 'text-foreground'}`}>
                      {on ? (percent != null ? `${percent}%` : 'On') : 'Off'}
                    </Label>
                  </View>
                  {percent != null && (
                    <Slider
                      accessibilityLabel={`${liveDevice.name} ${brightness ? 'brightness' : 'speed'}`}
                      minimumValue={1}
                      maximumValue={100}
                      step={1}
                      value={percent}
                      onSlidingComplete={value =>
                        sendCommand(liveDevice.id, brightness ? { kind: 'setBrightness', percent: value } : { kind: 'setFanSpeed', percent: value })
                      }
                      minimumTrackTintColor={appearance.onColor}
                      maximumTrackTintColor={appearance.color}
                      thumbTintColor={appearance.onColor}
                    />
                  )}
                  {onOff && (
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => sendCommand(liveDevice.id, { kind: 'setOnOff', on: !on })}
                      className="items-center rounded-full bg-primary-subtle py-4"
                    >
                      <Label className="text-[14px] font-medium text-primary-text">Turn {on ? 'off' : 'on'}</Label>
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
    </>
  );
}
