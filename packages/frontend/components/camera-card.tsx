import React, { useState, useSyncExternalStore } from 'react';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { assets } from '../data/assets';
import { useHomeActions } from '../state/home-context';
import { getCapability, type Device } from '../providers/types';
import { Icon } from '@willo.sh/ui';
import { Label } from '@willo.sh/ui';
import { useTranslation } from 'react-i18next';

// Home Assistant's camera snapshot URL carries its own short-lived signed
// token, so re-fetching it periodically (rather than opening a video
// stream) is enough for a "live-ish" thumbnail.
const SNAPSHOT_REFRESH_MS = 8000;

/**
 * One tick for every camera on screen, not one timer each: unaligned per-card
 * intervals meant each camera re-rendered and re-fetched on its own schedule,
 * so a screen with three of them woke up three times as often for no extra
 * freshness. The timer runs only while something is watching.
 */
let tick = 0;
let ticker: ReturnType<typeof setInterval> | null = null;
const watchers = new Set<() => void>();
function watchSnapshotTick(onTick: () => void) {
  watchers.add(onTick);
  ticker ??= setInterval(() => {
    tick += 1;
    watchers.forEach(watcher => watcher());
  }, SNAPSHOT_REFRESH_MS);
  return () => {
    watchers.delete(onTick);
    if (watchers.size === 0 && ticker) {
      clearInterval(ticker);
      ticker = null;
    }
  };
}

export function RealCameraCard({ camera, height = 194, width }: { camera: Device; height?: number; width?: number }) {
  const { setSheet, getAuthHeaders } = useHomeActions();
  const { t } = useTranslation();
  const refreshKey = useSyncExternalStore(watchSnapshotTick, () => tick, () => tick);
  const snapshotUrl = getCapability(camera, 'camera')?.snapshotUrl ?? null;
  // The snapshot is Willo's OWN backend endpoint now (relayed over the
  // tunnel), which is Oxy-authenticated — never a raw Home Assistant URL, so
  // this needs the same bearer header every other backend call carries.
  const uri = snapshotUrl ? `${snapshotUrl}?_=${refreshKey}` : undefined;
  return <View className="relative overflow-hidden rounded-[27px] bg-muted" style={{ height, width }}>
    <Pressable accessibilityRole="button" accessibilityLabel={t('camera.open', { name: camera.name })} onPress={() => setSheet({ kind: 'camera', title: camera.name, snapshotUrl })} className="absolute inset-0">
      {uri ? <Image source={{ uri, headers: getAuthHeaders() }} style={{ width: '100%', height: '100%' }} contentFit="cover"/> : <View className="h-full w-full items-center justify-center bg-home-ink"><Icon name="camera-off" color="white" size={28}/></View>}
    </Pressable>
    <View pointerEvents="none" className="absolute left-4 right-4 top-4 flex-row items-center justify-between">
      <View className="flex-row items-center gap-2"><View className="h-[7px] w-[7px] rounded-full bg-[#7bdd17]"/><Label className="text-[13px] font-medium text-white" style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 }}>{t('camera.live')}</Label></View>
    </View>
    <Label pointerEvents="none" className="absolute bottom-4 left-4 text-[12px] font-medium leading-[16px] text-white" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{camera.name}</Label>
  </View>;
}

export function CameraCard({ garden = false, height = 194, showBadge = true, label, width }: { garden?: boolean; height?: number; showBadge?: boolean; label?: string; width?: number }) {
  const { setSheet } = useHomeActions();
  const { t } = useTranslation();
  const [muted, setMuted] = useState(true);
  return <View className="relative overflow-hidden rounded-[27px] bg-muted" style={{ height, width }}>
    <Pressable accessibilityRole="button" accessibilityLabel={garden ? t('camera.openBackyardPreview') : t('camera.openLivingRoomPreview')} onPress={() => setSheet({ kind: 'camera', title: garden ? t('camera.backyardTitle') : t('camera.livingRoomTitle'), garden })} className="absolute inset-0"><Image source={garden ? assets.garden : assets.livingRoom} style={{ width: '100%', height: '100%' }} contentFit="cover"/></Pressable>
    <View pointerEvents="none" className="absolute left-4 right-4 top-4 flex-row items-center justify-between"><View className="flex-row items-center gap-2"><View className="h-[7px] w-[7px] rounded-full bg-[#7bdd17]"/><Label className="text-[13px] font-medium text-white" style={{ textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 3 }}>{t('camera.live')}</Label></View>{showBadge && <Label className="text-[13px] text-white">{t('camera.badge')}</Label>}</View>
    {(garden || label) && <Label pointerEvents="none" className="absolute bottom-4 left-4 text-[12px] font-medium leading-[16px] text-white" style={{ textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 3 }}>{label ?? t('camera.yardLabel')}</Label>}
    <Pressable accessibilityRole="button" accessibilityLabel={muted ? t('camera.unmutePreview') : t('camera.mutePreview')} accessibilityState={{ selected: !muted }} onPress={() => setMuted(value => !value)} className="absolute bottom-3 right-3 h-9 w-9 items-center justify-center rounded-full bg-black/25 active:opacity-60"><Icon name={muted ? 'camera-off' : 'camera'} color="white" size={23}/></Pressable>
  </View>;
}
