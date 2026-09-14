import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { AskHeader } from '../components/headers';
import { RealCameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo/ui';
import { Label, Tile } from '@willo/ui';
import { ThermostatCard } from '../components/thermostat-card';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import type { DeviceKey } from '../state/home-reducer';
import type { CameraDevice, LightDevice } from '../providers/types';
import { colors } from '@willo/ui';

type Category = 'Favorites' | 'All' | 'Cameras' | 'Lights' | 'Wifi' | 'Climate';
const categories: { name: Category; icon: IconName }[] = [
  { name: 'Favorites', icon: 'heart' }, { name: 'All', icon: 'grid' }, { name: 'Cameras', icon: 'camera' },
  { name: 'Lights', icon: 'light' }, { name: 'Wifi', icon: 'wifi' }, { name: 'Climate', icon: 'climate' },
];
type HomeCard = DashboardCard & { category: Category };

export function HomeScreen({ onNavigate }: ScreenProps) {
  const { state, dispatch, setSheet, devices, toggleLight, toggleFan } = useHome();
  const { compact, columns } = useResponsiveLayout();
  const [selected, setSelected] = useState<Category>('Favorites');
  const full = compact ? 2 : 1;
  const message = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  const lightTile = (light: LightDevice) => <Tile grow={false} height={80} title={light.name}
    subtitle={light.on ? (light.brightness != null ? `On · ${light.brightness}%` : 'On') : 'Off'}
    icon="light" tone={light.on ? 'yellow' : 'neutral'} active={light.on}
    brightness={light.on ? light.brightness ?? undefined : undefined}
    onPress={() => toggleLight(light.id, !light.on)}
    onLongPress={() => setSheet({ kind: 'light', title: light.name, light })}/>;
  const noLights = <Tile grow={false} height={80} title="No lights found" subtitle="Check Home Assistant" icon="light" tone="neutral" onPress={() => onNavigate('settings')}/>;
  const cameraTile = (camera: CameraDevice, cameraHeight: number) => <RealCameraCard key={camera.id} camera={camera} height={cameraHeight}/>;
  const noCameras = <Tile grow={false} height={80} title="No cameras found" subtitle="Check Home Assistant" icon="camera-off" tone="neutral" onPress={() => onNavigate('settings')}/>;
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
  const fanDevice = devices.fans[0];
  const fanTile = fanDevice ? <Tile grow={false} height={80} title={fanDevice.name}
    subtitle={fanDevice.on ? (fanDevice.percentage != null ? `On · ${fanDevice.percentage}%` : 'On') : 'Off'}
    icon="fan" tone={fanDevice.on ? 'blue' : 'neutral'} active={fanDevice.on}
    onPress={() => toggleFan(fanDevice.id, !fanDevice.on)}
    onLongPress={() => setSheet({ kind: 'fan', title: fanDevice.name, fan: fanDevice })}/>
    : <Tile grow={false} height={80} title="No fan found" subtitle="Check Home Assistant" icon="fan" tone="neutral" onPress={() => onNavigate('settings')}/>;
  const sensorList = <View className="gap-3 rounded-[24px] bg-home-surface p-4">
    <View className="flex-row items-center gap-2"><Icon name="home" size={16}/><Label className="min-w-0 flex-1 text-[12px]">Indoor readings</Label></View>
    {devices.sensors.length === 0 && <Label className="text-[11px] text-home-muted">No sensors found</Label>}
    {devices.sensors.map(sensor =>
      <View key={sensor.id} className="flex-row items-center justify-between gap-3"><Label className="min-w-0 flex-1 text-[11px]">{sensor.name}</Label><Label className="text-[11px]">{sensor.value != null ? `${sensor.value}${sensor.unit ?? ''}` : '—'}</Label></View>)}
  </View>;
  const base = {
    camera: { id: 'camera', category: 'Cameras', span: full, lane: 0, estimatedHeight: compact ? 188 : 170, content: devices.cameras[0] ? cameraTile(devices.cameras[0], compact ? 188 : 170) : noCameras },
    lock: { id: 'lock', category: 'All', lane: 0, estimatedHeight: 80, content: lock },
    light: { id: 'light', category: 'Lights', lane: 1, estimatedHeight: 80, content: devices.lights[0] ? lightTile(devices.lights[0]) : noLights },
    thermostat: { id: 'thermostat', category: 'Climate', span: full, lane: 2, estimatedHeight: compact ? 228 : 238, content: <ThermostatCard/> },
    weather: { id: 'weather', category: 'Climate', lane: 3, estimatedHeight: 72, content: weather },
    air: { id: 'air', category: 'Climate', lane: 3, estimatedHeight: 72, content: air },
    fan: { id: 'fan', category: 'Climate', lane: 3, estimatedHeight: 80, content: fanTile },
    tv: { id: 'tv', category: 'All', lane: 1, estimatedHeight: 80, content: device('tv', 'TV', 'tv') },
    garage: { id: 'garage', category: 'All', lane: 0, estimatedHeight: 80, content: device('garage', 'Garage', 'garage') },
    speaker: { id: 'speaker', category: 'All', lane: 1, estimatedHeight: 80, content: device('speaker', 'Speaker', 'speaker') },
    garden: { id: 'garden', category: 'Cameras', lane: 2, estimatedHeight: 240, content: devices.cameras[1] ? cameraTile(devices.cameras[1], 240) : noCameras },
    plug: { id: 'plug', category: 'All', lane: 1, estimatedHeight: 80, content: device('plug', 'Plug', 'plug') },
    sensors: { id: 'sensors', category: 'Climate', lane: 3, estimatedHeight: 196, content: sensorList },
    floor: { id: 'floor', category: 'Lights', lane: 1, estimatedHeight: 80, content: devices.lights[1] ? lightTile(devices.lights[1]) : noLights },
    wifi: { id: 'wifi', category: 'Wifi', estimatedHeight: 80, content: <Tile grow={false} title="Office WiFi" subtitle="Settings preview" icon="wifi" tone="green" onPress={() => onNavigate('settings')}/> },
  } satisfies Record<string, HomeCard>;
  const order: (keyof typeof base)[] = compact
    ? ['camera', 'lock', 'light', 'thermostat', 'weather', 'air']
    : ['camera', 'light', 'thermostat', 'fan', 'lock', 'tv', 'air', 'garage', 'speaker', 'garden', 'weather', 'plug', 'sensors', 'floor'];
  // Beyond the favorite slots above, the full Lights/Cameras tabs list every
  // real light or camera Home Assistant reports, not just a fixed pair.
  const extraLightCards: HomeCard[] = devices.lights.slice(2).map((light, index) => ({
    id: `light-${light.id}`, category: 'Lights', lane: index % 4, estimatedHeight: 80, content: lightTile(light),
  }));
  const extraCameraCards: HomeCard[] = devices.cameras.slice(2).map((camera, index) => ({
    id: `camera-${camera.id}`, category: 'Cameras', lane: index % 2, estimatedHeight: 170, content: cameraTile(camera, 170),
  }));
  const visible: HomeCard[] = selected === 'Favorites' ? order.map(id => base[id])
    : selected === 'All' ? [...order, ...(Object.keys(base) as (keyof typeof base)[]).filter(id => !order.includes(id))].map(id => ({ ...base[id], lane: undefined }))
    : selected === 'Lights' ? [...Object.values(base).filter(card => card.category === 'Lights'), ...extraLightCards].map(card => ({ ...card, lane: undefined }))
    : selected === 'Cameras' ? [...Object.values(base).filter(card => card.category === 'Cameras'), ...extraCameraCards].map(card => ({ ...card, lane: undefined, span: compact ? 2 : 1 }))
    : Object.values(base).filter(card => card.category === selected).map(card => ({ ...card, lane: undefined }));
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
