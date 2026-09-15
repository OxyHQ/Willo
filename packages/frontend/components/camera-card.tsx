import React, { useEffect, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { assets } from '../data/assets';
import { useHome } from '../state/home-context';
import { getCapability, type Device } from '../providers/types';
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';

// Home Assistant's camera snapshot URL carries its own short-lived signed
// token, so re-fetching it periodically (rather than opening a video
// stream) is enough for a "live-ish" thumbnail.
const SNAPSHOT_REFRESH_MS = 8000;

export function RealCameraCard({ camera, height = 194, width }: { camera: Device; height?: number; width?: number }) {
  const { setSheet, getAuthHeaders } = useHome();
  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setRefreshKey(key => key + 1), SNAPSHOT_REFRESH_MS);
    return () => clearInterval(interval);
  }, []);
  const snapshotUrl = getCapability(camera, 'camera')?.snapshotUrl ?? null;
  // The snapshot is Willo's OWN backend endpoint now (relayed over the
  // tunnel), which is Oxy-authenticated — never a raw Home Assistant URL, so
  // this needs the same bearer header every other backend call carries.
  const uri = snapshotUrl ? `${snapshotUrl}?_=${refreshKey}` : undefined;
  return <View className="relative overflow-hidden rounded-[27px] bg-muted" style={{ height, width }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${camera.name}`} onPress={() => setSheet({ kind: 'camera', title: camera.name, snapshotUrl })} className="absolute inset-0">
      {uri ? <Image source={{ uri, headers: getAuthHeaders() }} style={{ width: '100%', height: '100%' }} contentFit="cover"/> : <View className="h-full w-full items-center justify-center bg-home-ink"><Icon name="camera-off" color="white" size={28}/></View>}
    </Pressable>
    <View pointerEvents="none" className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2"><View className="h-[7px] w-[7px] rounded-full bg-[#7bdd17]"/><Label className="text-[13px] font-medium text-white" style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 }}>Live</Label></View>
    </View>
    <Label pointerEvents="none" className="absolute bottom-4 left-4 text-[12px] font-medium leading-[16px] text-white" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{camera.name}</Label>
  </View>;
}

export function CameraCard({ garden = false, height = 194, showBadge = true, label, width }: { garden?: boolean; height?: number; showBadge?: boolean; label?: string; width?: number }) {
  const { setSheet } = useHome();
  const [muted, setMuted] = useState(true);
  return <View className="relative overflow-hidden rounded-[27px] bg-muted" style={{ height, width }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${garden ? 'backyard' : 'living room'} camera preview`} onPress={() => setSheet({ kind: 'camera', title: garden ? 'Backyard camera' : 'Living room camera', garden })} className="absolute inset-0"><Image source={garden ? assets.garden : assets.livingRoom} style={{ width: '100%', height: '100%' }} contentFit="cover"/></Pressable>
    <View pointerEvents="none" className="absolute left-4 right-4 top-4 flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="h-[7px] w-[7px] rounded-full bg-[#7bdd17]"/><Label className="text-[13px] font-medium text-white" style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 }}>Live</Label></View>{showBadge && <Label className="text-[13px] text-white">Cam</Label>}</View>
    {(garden || label) && <Label pointerEvents="none" className="absolute bottom-4 left-4 text-[12px] font-medium leading-[16px] text-white" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{label ?? 'Yard cam'}</Label>}
    <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Unmute preview' : 'Mute preview'} accessibilityState={{ selected: !muted }} onPress={() => setMuted(value => !value)} className="absolute bottom-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-black/25 active:opacity-60"><Icon name={muted ? 'camera-off' : 'camera'} color="white" size={23}/></Pressable>
  </View>;
}
