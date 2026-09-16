import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { RealCameraCard } from '../components/camera-card';
import { DeviceTile } from '../components/device-tile';
import { type Device } from '../providers/types';
import { Icon, type IconName } from '@willo.sh/ui';
import { Label, SectionTitle, Tile } from '@willo.sh/ui';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { CardStrip, PageScroll } from '../layout/page-layout';
import { cardHeight } from '../layout/card-sizes';
import { useResponsiveLayout } from '../layout/use-responsive-layout';
import type { ScreenProps } from '../data/screens';
import { useDevices, useHome, useHomeActions } from '../state/home-context';
import { tones, type Tone } from '@willo.sh/ui';
import { formatTemperature } from '../providers/unit-system';
import { useTranslation } from 'react-i18next';
// `id` is what the tap handler branches on — never the (translated) title.
const categories = [
  { id: 'cameras', icon: 'camera', titleKey: 'favorites.categories.cameras', countKey: 'favorites.counts.cameras', count: 6, assistantCount: 3, tone: 'blue' },
  { id: 'lighting', icon: 'light', titleKey: 'favorites.categories.lighting', countKey: 'favorites.counts.lights', count: 8, assistantCount: 12, tone: 'yellow' },
  { id: 'wifi', icon: 'wifi', titleKey: 'favorites.categories.wifi', countKey: 'favorites.counts.devices', count: 2, assistantCount: 2, tone: 'green' },
  { id: 'climate', icon: 'climate', titleKey: 'favorites.categories.climate', countKey: 'favorites.counts.devices', count: 2, assistantCount: 2, tone: 'peach' },
] as const satisfies readonly { id: string; icon: IconName; titleKey: string; countKey: string; count: number; assistantCount: number; tone: Tone }[];
export function FavoritesScreen({ onNavigate, withAssistant = false }: ScreenProps & { withAssistant?: boolean }) {
  const { state } = useHome();
  const { dispatch, setSheet, notify } = useHomeActions();
  const devices = useDevices();
  const { compact, gap } = useResponsiveLayout();
  const { t } = useTranslation();
  const displayCategories = withAssistant ? [categories[0], categories[1], categories[3], categories[2]] : categories;
  // Whole tile rows, like the Home dashboard — see `layout/card-sizes.ts`.
  const tile = cardHeight(1, gap);
  const yardHeight = cardHeight(3, gap);
  // The favourites strip is a short, curated front page over the same device
  // list every other screen reads — one of each kind a person reaches for,
  // plus the two assistant shortcuts that aren't devices at all.
  const pick = (domain: string) => devices.find(device => device.domain === domain);
  const deviceCard = (device: Device | undefined) => device
    ? [{ id: device.id, estimatedHeight: tile, content: <DeviceTile device={device} height={tile} grow={false}/> }]
    : [];
  const garden = devices.find(device => device.domain === 'camera' && device.room !== null && device.id.includes('garden'));
  const cards: DashboardCard[] = [
    { id: 'first', estimatedHeight: tile, content: withAssistant
      ? <Tile grow={false} height={tile} title={t('demo.devices.broadcast')} icon="broadcast" onPress={() => setSheet({ kind: 'message', title: t('demo.devices.broadcast'), description: t('favorites.broadcastDescription') })}/>
      : <Tile grow={false} height={tile} title={t('demo.devices.assistant')} icon="microphone" onPress={() => onNavigate('assistant')}/> },
    ...deviceCard(pick('lock')),
    ...(garden ? [{ id: garden.id, span: compact ? 2 : 1, estimatedHeight: yardHeight, content: <RealCameraCard camera={garden} height={yardHeight}/> }] : []),
    ...deviceCard(pick('light')),
    { id: 'movie', estimatedHeight: tile, content: <Tile grow={false} height={tile} title={t('demo.devices.movieMode')} icon="sparkle" tone={state.movieMode ? 'blue' : 'neutral'} active={state.movieMode} onPress={() => { dispatch({ type: 'TOGGLE_MOVIE' }); notify(state.movieMode ? t('automations.movieStopped') : t('automations.movieStarted')); }}/> },
    ...deviceCard(pick('cover')),
    ...deviceCard(pick('vacuum')),
  ];
  return <View className="min-h-0 flex-1">
    <PageScroll><CardStrip>
      {displayCategories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={t(category.titleKey)}
        onPress={() => category.id === 'cameras' ? setSheet({ kind: 'camera', title: t('camera.backyardTitle'), garden: true }) : onNavigate(category.id === 'wifi' ? 'settings' : 'devices')}
        className={`min-h-[100px] justify-between rounded-[23px] p-3.5 active:opacity-70 ${tones[category.tone].tile}`}
        style={{ width: compact ? 104 : 160, gap: 14 }}>
        <Icon name={category.icon} size={20} color={tones[category.tone].color}/><View><Label className="text-[12px]">{t(category.titleKey)}</Label><Label className="mt-0.5 text-[10px]">{t(category.countKey, { count: withAssistant ? category.assistantCount : category.count })}</Label></View>
      </Pressable>)}
    </CardStrip><SectionTitle>{t('favorites.title')}</SectionTitle><DashboardGrid cards={cards}/></PageScroll>
  </View>;
}
