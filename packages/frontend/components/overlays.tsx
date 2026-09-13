import React, { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import Slider from '@react-native-community/slider';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { BottomSheet, type BottomSheetRef } from '@oxy.so/bloom/bottom-sheet';
import { assets } from '../data/assets';
import { useHome, type Sheet } from '../state/home-context';
import { colors, Icon, IconButton, Label } from '@willo/ui';

/** One host in the root layout, not one modal per retained router screen. */
export function Overlays() {
  const { state, dispatch, sheet, setSheet, toast } = useHome();
  const { width } = useWindowDimensions();
  const sheetRef = useRef<BottomSheetRef>(null);
  // Retain content until Bloom finishes the dismissal animation.
  const [shown, setShown] = useState<Sheet>(null);

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
                {shown.description && <Label className="mb-3 text-[12px] leading-[18px] text-home-muted">{shown.description}</Label>}
                {shown.options.map(option => (
                  <Pressable key={option.label} accessibilityRole="button" accessibilityState={{ selected: option.selected }}
                    onPress={option.onPress}
                    className={`mb-2 min-h-[53px] flex-row items-center gap-3 rounded-[18px] px-4 py-3 ${option.selected ? 'bg-home-sky' : 'bg-home-surface'}`}>
                    <View className="min-w-0 flex-1">
                      <Label className="text-[14px]">{option.label}</Label>
                      {option.description && <Label className="mt-1 text-[11px] text-home-muted">{option.description}</Label>}
                    </View>
                    {option.selected && <Icon name="check" size={18} color={colors.onSky} />}
                  </Pressable>
                ))}
              </>
            )}
            {shown.kind === 'message' && <Label selectable className="pb-3 text-[14px] leading-[23px] text-home-muted">{shown.description}</Label>}
            {shown.kind === 'camera' && (
              <>
                <View className="h-[220px] overflow-hidden rounded-[25px]">
                  <Image source={shown.garden ? assets.garden : assets.livingRoom} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                </View>
                <Label className="mt-4 text-[12px] leading-[18px] text-home-muted">Static reference image. No live video or audio stream is connected.</Label>
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
                  className="items-center rounded-full bg-home-sky py-4">
                  <Label className="text-[14px] font-medium text-home-on-sky">Turn {state.devices[shown.id] ? 'off' : 'on'}</Label>
                </Pressable>
                <Label className="text-center text-[11px] text-home-muted">Changes affect this demo session only.</Label>
              </View>
            )}
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
