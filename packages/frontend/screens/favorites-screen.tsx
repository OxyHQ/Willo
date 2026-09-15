import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { CameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo.sh/ui';
import { Label, SectionTitle, Tile } from '@willo.sh/ui';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { CardStrip, PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
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
export function FavoritesScreen({ onNavigate, withAssistant = false, header }: ScreenProps & { withAssistant?: boolean }) {
  const { state, dispatch, setSheet, notify, unitSystem } = useHome();
  const { compact } = useResponsiveLayout();
  const { t } = useTranslation();
  const [assistantVacuum, setAssistantVacuum] = useState(true);
  const vacuumRunning = withAssistant ? assistantVacuum : state.devices.vacuum;
  const displayCategories = withAssistant ? [categories[0], categories[1], categories[3], categories[2]] : categories;
  const cards: DashboardCard[] = [
    { id: 'first', estimatedHeight: 80, content: withAssistant
      ? <Tile grow={false} title={t('demo.devices.broadcast')} icon="broadcast" onPress={() => setSheet({ kind: 'message', title: t('demo.devices.broadcast'), description: t('favorites.broadcastDescription') })}/>
      : <Tile grow={false} title={t('demo.devices.hallwayThermostat')} subtitle={t('deviceState.indoor', { temperature: formatTemperature(70, '°F', unitSystem) })} icon="thermometer" tone="peach" chevron onPress={() => onNavigate('home')}/> },
    { id: 'second', estimatedHeight: 80, content: withAssistant
      ? <Tile grow={false} title={t('demo.devices.assistant')} icon="microphone" onPress={() => onNavigate('assistant')}/>
      : <Tile grow={false} title={t('demo.devices.frontDoorLock')} subtitle={state.locked ? t('deviceState.locked') : t('deviceState.unlocked')} tone={state.locked ? 'blue' : 'neutral'} icon={state.locked ? 'lock' : 'unlock'} active={state.locked} onPress={() => dispatch({ type: 'TOGGLE_LOCK' })}/> },
    { id: 'yard', span: compact ? 2 : 1, estimatedHeight: compact ? 196 : 284, content: <CameraCard garden showBadge={false} height={compact ? 196 : 284} label={withAssistant ? t('camera.backyardTitle') : t('camera.yardLabel')}/> },
    { id: 'pantry', estimatedHeight: 80, content: <Tile grow={false} title={withAssistant ? t('demo.devices.kitchenPantryLight') : t('demo.devices.pantryLight')} subtitle={state.devices.pantry ? t('deviceState.onPercent', { percent: state.brightness.pantry }) : t('deviceState.off')} icon="light" tone={state.devices.pantry ? 'yellow' : 'neutral'} active={state.devices.pantry} brightness={state.devices.pantry ? state.brightness.pantry : undefined} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: 'pantry' })} onLongPress={() => setSheet({ kind: 'device', title: t('demo.devices.pantryLight'), id: 'pantry' })} accessibilityHint={t('tile.holdHint')}/> },
    { id: 'movie', estimatedHeight: 80, content: <Tile grow={false} title={t('demo.devices.movieMode')} icon="sparkle" tone={state.movieMode ? 'blue' : 'neutral'} active={state.movieMode} onPress={() => { dispatch({ type: 'TOGGLE_MOVIE' }); notify(state.movieMode ? t('automations.movieStopped') : t('automations.movieStarted')); }}/> },
    { id: 'blinds', estimatedHeight: 80, content: <Tile grow={false} title={t('demo.devices.livingRoomBlinds')} subtitle={state.devices.blinds ? t('deviceState.open') : t('deviceState.closed')} icon="blinds" tone={state.devices.blinds ? 'blue' : 'neutral'} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id: 'blinds' })}/> },
    { id: 'vacuum', estimatedHeight: 80, content: <Tile grow={false} title={t('demo.devices.vacuum')} subtitle={vacuumRunning ? t('deviceState.running') : t('deviceState.paused')} icon="vacuum" tone={vacuumRunning ? 'blue' : 'neutral'} onPress={() => withAssistant ? setAssistantVacuum(value => !value) : dispatch({ type: 'TOGGLE_DEVICE', id: 'vacuum' })}/> },
  ];
  return <View className="min-h-0 flex-1 bg-card">
    <PageScroll>{header}<CardStrip>
      {displayCategories.map(category => <Pressable key={category.id} accessibilityRole="button" accessibilityLabel={t(category.titleKey)}
        onPress={() => category.id === 'cameras' ? setSheet({ kind: 'camera', title: t('camera.backyardTitle'), garden: true }) : onNavigate(category.id === 'wifi' ? 'settings' : 'devices')}
        className={`min-h-[100px] justify-between rounded-[23px] p-3.5 active:opacity-70 ${tones[category.tone].tile}`}
        style={{ width: compact ? 104 : 160, gap: 14 }}>
        <Icon name={category.icon} size={20} color={tones[category.tone].color}/><View><Label className="text-[12px]">{t(category.titleKey)}</Label><Label className="mt-0.5 text-[10px]">{t(category.countKey, { count: withAssistant ? category.assistantCount : category.count })}</Label></View>
      </Pressable>)}
    </CardStrip><SectionTitle>{t('favorites.title')}</SectionTitle><DashboardGrid cards={cards}/></PageScroll>
  </View>;
}
