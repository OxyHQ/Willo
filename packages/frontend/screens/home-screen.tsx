import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AskHeader } from '../components/headers';
import { CameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo/ui';
import { Label, Tile } from '@willo/ui';
import { ThermostatCard } from '../components/thermostat-card';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import type { DeviceKey } from '../state/home-reducer';
import { colors } from '@willo/ui';

type Category = 'Favorites' | 'All' | 'Cameras' | 'Lights' | 'Wifi' | 'Climate';
const categories: { name: Category; icon: IconName }[] = [
  { name: 'Favorites', icon: 'heart' }, { name: 'All', icon: 'grid' }, { name: 'Cameras', icon: 'camera' },
  { name: 'Lights', icon: 'light' }, { name: 'Wifi', icon: 'wifi' }, { name: 'Climate', icon: 'climate' },
];
type HomeCard = DashboardCard & { category: Category };

export function HomeScreen({ onNavigate }: ScreenProps) {
  const { state, dispatch, setSheet } = useHome();
  const { compact, columns } = useResponsiveLayout();
  const [selected, setSelected] = useState<Category>('Favorites');
  const [sensorSelection, setSensorSelection] = useState(['Downstairs', 'Living room', 'Guest bedroom']);
  const full = compact ? 2 : 1;
  const message = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  const device = (id: DeviceKey, title: string, icon: IconName, light = false) => <Tile grow={false} height={80} title={title}
    subtitle={id === 'garage' ? (state.devices[id] ? 'Open' : 'Closed') : state.devices[id] ? (light || id === 'speaker' ? `${id === 'speaker' ? 'Playing' : 'On'} · ${state.brightness[id] ?? 50}%` : 'On') : 'Off'}
    icon={icon} tone={state.devices[id] ? (light ? 'yellow' : 'blue') : id === 'garage' ? 'blue' : 'neutral'}
    active={state.devices[id]} brightness={light && state.devices[id] ? state.brightness[id] : undefined}
    onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id })}
    onLongPress={light ? () => setSheet({ kind: 'device', title, id }) : undefined}/>;
  const lock = <Tile grow={false} title="Front door lock" subtitle={state.locked ? 'Locked' : 'Unlocked'}
    icon={state.locked ? 'lock' : 'unlock'} tone={state.locked ? 'blue' : 'neutral'} active={state.locked}
    onPress={() => dispatch({ type: 'TOGGLE_LOCK' })}/>;
  const weather = <Tile grow={false} title="San Francisco" subtitle="56° · Clear" icon="sun" height={72}
    onPress={() => message('Weather preview', 'The weather and location are static values from the supplied reference.')}/>;
  const air = <Tile grow={false} title="Outdoor AQI" subtitle="32 · Good" icon="waves" height={72}
    onPress={() => message('Air quality preview', 'AQI 32 is a static reference value, not a live reading.')}/>;
  const temperatureList = <View className="gap-3 rounded-[24px] bg-home-surface p-4">
    <View className="flex-row items-center gap-2"><Icon name="home" size={16}/><Label className="min-w-0 flex-1 text-[12px]">Indoor temperatures</Label></View>
    {([{ name: 'Downstairs', value: '66°' }, { name: 'Living room', value: '67°' }, { name: 'Guest bedroom', value: '75°' }]).filter(sensor => sensorSelection.includes(sensor.name)).map(sensor =>
      <View key={sensor.name} className="flex-row items-center justify-between gap-3"><Label className="min-w-0 flex-1 text-[11px]">{sensor.name}</Label><Label className="text-[11px]">{sensor.value} ✓</Label></View>)}
    <Pressable accessibilityRole="button" onPress={() => setSheet({ kind: 'menu', title: 'Select sensors', description: 'Static demo readings. Select a sensor to show or hide it.', options: ['Downstairs', 'Living room', 'Guest bedroom'].map(name => ({ label: name, selected: sensorSelection.includes(name), onPress: () => { setSensorSelection(previous => previous.includes(name) ? previous.filter(item => item !== name) : [...previous, name]); setSheet(null); } })) })}
      className="min-h-[44px] items-center justify-center rounded-full bg-home-sky px-3 py-2"><Label className="text-[12px] text-home-on-sky">Select sensors</Label></Pressable>
  </View>;
  const base = {
    camera: { id: 'camera', category: 'Cameras', span: full, lane: 0, estimatedHeight: compact ? 188 : 170, content: <CameraCard height={compact ? 188 : 170} showNest={compact}/> },
    lock: { id: 'lock', category: 'All', lane: 0, estimatedHeight: 80, content: lock },
    light: { id: 'light', category: 'Lights', lane: 1, estimatedHeight: 80, content: device('light', compact ? 'Light' : 'Front door light', 'light', true) },
    thermostat: { id: 'thermostat', category: 'Climate', span: full, lane: 2, estimatedHeight: compact ? 228 : 238, content: <ThermostatCard/> },
    weather: { id: 'weather', category: 'Climate', lane: 3, estimatedHeight: 72, content: weather },
    air: { id: 'air', category: 'Climate', lane: 3, estimatedHeight: 72, content: air },
    fan: { id: 'fan', category: 'Climate', lane: 3, estimatedHeight: 80, content: device('fan', 'Fan', 'fan') },
    tv: { id: 'tv', category: 'All', lane: 1, estimatedHeight: 80, content: device('tv', 'TV', 'tv') },
    garage: { id: 'garage', category: 'All', lane: 0, estimatedHeight: 80, content: device('garage', 'Garage', 'garage') },
    speaker: { id: 'speaker', category: 'All', lane: 1, estimatedHeight: 80, content: device('speaker', 'Speaker', 'speaker') },
    garden: { id: 'garden', category: 'Cameras', lane: 2, estimatedHeight: 240, content: <CameraCard garden height={240} showNest={false}/> },
    plug: { id: 'plug', category: 'All', lane: 1, estimatedHeight: 80, content: device('plug', 'Plug', 'plug') },
    sensors: { id: 'sensors', category: 'Climate', lane: 3, estimatedHeight: 196, content: temperatureList },
    floor: { id: 'floor', category: 'Lights', lane: 1, estimatedHeight: 80, content: device('floor-lamp', 'Floor lamp', 'light', true) },
    wifi: { id: 'wifi', category: 'Wifi', estimatedHeight: 80, content: <Tile grow={false} title="Office WiFi" subtitle="Settings preview" icon="wifi" tone="green" onPress={() => onNavigate('settings')}/> },
  } satisfies Record<string, HomeCard>;
  const order: (keyof typeof base)[] = compact
    ? ['camera', 'lock', 'light', 'thermostat', 'weather', 'air']
    : ['camera', 'light', 'thermostat', 'fan', 'lock', 'tv', 'air', 'garage', 'speaker', 'garden', 'weather', 'plug', 'sensors', 'floor'];
  const visible: HomeCard[] = selected === 'Favorites' ? order.map(id => base[id])
    : selected === 'All' ? [...order, ...(Object.keys(base) as (keyof typeof base)[]).filter(id => !order.includes(id))].map(id => ({ ...base[id], lane: undefined }))
    : Object.values(base).filter(card => card.category === selected).map(card => ({ ...card, lane: undefined, span: selected === 'Cameras' && compact ? 2 : 1 }));
  return <View className="min-h-0 flex-1 bg-white"><AskHeader onNavigate={onNavigate}/>
    <PageScroll>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16, gap: 8 }}>
        {categories.map(category => {
          const active = selected === category.name;
          const textVisible = !compact || category.name === 'Favorites';
          return <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={category.name} accessibilityState={{ selected: active }}
            onPress={() => setSelected(category.name)} className={`h-[50px] flex-row items-center justify-center gap-2 active:opacity-70 ${active ? 'bg-home-sky' : 'bg-home-surface'} ${textVisible ? 'rounded-[18px] px-4' : 'w-[50px] rounded-full'}`}>
            <Icon name={category.icon} filled={active && category.icon === 'heart'} size={compact ? 21 : 18} color={active ? colors.onSky : colors.muted}/>
            {textVisible && <Label className={`text-[14px] ${active ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{category.name}</Label>}
          </Pressable>;
        })}
      </ScrollView>
      <DashboardGrid cards={visible} columns={selected === 'Cameras' && !compact ? Math.min(columns, 2) : columns}/>
    </PageScroll>
  </View>;
}
