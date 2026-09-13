import React, { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { assets } from '../data/assets';
import { useHome } from '../state/home-context';
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';
export function CameraCard({ garden = false, height = 194, showNest = true, label, width }: { garden?: boolean; height?: number; showNest?: boolean; label?: string; width?: number }) {
  const { setSheet } = useHome();
  const [muted, setMuted] = useState(true);
  return <View className="relative overflow-hidden rounded-[27px] bg-home-surface" style={{ height, width }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${garden ? 'backyard' : 'living room'} camera preview`} onPress={() => setSheet({ kind: 'camera', title: garden ? 'Backyard camera' : 'Living room camera', garden })} className="absolute inset-0"><Image source={garden ? assets.garden : assets.livingRoom} style={{ width: '100%', height: '100%' }} contentFit="cover"/></Pressable>
    <View pointerEvents="none" className="absolute left-4 right-4 top-4 flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="h-[7px] w-[7px] rounded-full bg-[#7bdd17]"/><Label className="text-[13px] font-medium text-white" style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 }}>Live</Label></View>{showNest && <Label className="text-[13px] text-white">Nest</Label>}</View>
    {(garden || label) && <Label pointerEvents="none" className="absolute bottom-4 left-4 text-[12px] font-medium leading-[16px] text-white" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{label ?? 'Yard cam'}</Label>}
    <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute preview' : 'Mute preview'} accessibilityState={{ selected: !muted }} onPress={() => setMuted(value => !value)} className="absolute bottom-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-black/25 active:opacity-60"><Icon name={muted ? 'camera-off' : 'camera'} color="white" size={23}/></Pressable>
  </View>;
}
