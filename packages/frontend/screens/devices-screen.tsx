import React from 'react';
import { View } from 'react-native';
import { PageScroll, SectionGrid } from '../layout/page-layout';
import { AddButton, SectionTitle, Tile } from '@willo/ui';
import { type ScreenProps } from '../data/screens';
import { type DeviceKey } from '../state/home-reducer';
import { useHome } from '../state/home-context';
import { getCapability, type Device } from '../providers/types';
import { RealCameraCard } from '../components/camera-card';
import { type IconName } from '@willo/ui';
const chunkPairs = <T,>(items: T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2));
const groupByRoom = <T extends { room: string | null }>(items: T[]): Map<string, T[]> => {
  const byRoom = new Map<string, T[]>();
  for (const item of items) {
    const room = item.room ?? 'Other';
    byRoom.set(room, [...(byRoom.get(room) ?? []), item]);
  }
  return byRoom;
};
export function DevicesScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, setSheet, devices, sendCommand } = useHome();
  const device = (id: DeviceKey, title: string, icon: IconName, light = false) => <Tile key={id} title={title} subtitle={id.includes('blinds') ? state.devices[id] ? 'Open' : 'Closed' : id === 'vacuum' ? state.devices[id] ? 'Running' : 'Paused' : state.devices[id] ? light || id === 'tv' ? `On · ${state.brightness[id] ?? 50}%` : 'On' : 'Off'} icon={icon} tone={state.devices[id] || id.includes('blinds') ? light ? 'yellow' : 'blue' : 'neutral'} brightness={light && state.devices[id] ? state.brightness[id] : undefined} active={state.devices[id]} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id })} onLongPress={light || id === 'tv' ? () => setSheet({ kind: 'device', title, id }) : undefined}/>;
  const lightTile = (light: Device) => {
    const onOff = getCapability(light, 'onOff');
    const brightness = getCapability(light, 'brightness');
    return <Tile key={light.id} title={light.name}
      subtitle={onOff?.on ? (brightness?.percent != null ? `On · ${brightness.percent}%` : 'On') : 'Off'}
      icon="light" tone={onOff?.on ? 'yellow' : 'neutral'} active={onOff?.on}
      brightness={onOff?.on ? brightness?.percent ?? undefined : undefined}
      onPress={() => sendCommand(light.id, { kind: 'setOnOff', on: !onOff?.on })}
      onLongPress={() => setSheet({ kind: 'realDevice', title: light.name, device: light })}/>;
  };
  const lightsByRoom = groupByRoom(devices.filter(d => d.domain === 'light'));
  const camerasByRoom = groupByRoom(devices.filter(d => d.domain === 'camera'));
  return <View className="flex-1 bg-white"><PageScroll bottom={96}>{header}<SectionGrid>
    <View><SectionTitle>Front room</SectionTitle><View className="flex-row gap-2">{device('tv', 'TV', 'tv')}<Tile title="Thermostat" subtitle="Indoor 70°" icon="thermometer" tone="peach" chevron onPress={() => onNavigate('home')}/></View>
    </View><View><SectionTitle>Living room</SectionTitle><View className="gap-2"><View className="flex-row gap-2">{device('living-lamp', 'Lamp', 'light', true)}<Tile title="Camera" icon="camera" tone="blue" chevron onPress={() => setSheet({ kind: 'camera', title: 'Living room camera' })}/></View><View className="flex-row gap-2">{device('blinds', 'Blinds', 'blinds')}{device('vacuum', 'Vacuum', 'vacuum')}</View></View>
    </View><View><SectionTitle>Office</SectionTitle><View className="gap-2"><View className="flex-row gap-2">{device('plug', 'Smart plug', 'plug')}{device('office-lamp', 'Lamp', 'light', true)}</View><View className="flex-row gap-2">{device('office-blinds', 'Blinds', 'blinds')}<View className="flex-1"/></View></View>
    </View>
    {[...lightsByRoom.entries()].map(([room, roomLights]) => (
      <View key={`lights-${room}`}><SectionTitle>{room} lights</SectionTitle><View className="gap-2">
        {chunkPairs(roomLights).map((pair, index) => <View key={index} className="flex-row gap-2">{pair.map(lightTile)}{pair.length === 1 && <View className="flex-1"/>}</View>)}
      </View></View>
    ))}
    {[...camerasByRoom.entries()].map(([room, roomCameras]) => (
      <View key={`cameras-${room}`}><SectionTitle>{room} cameras</SectionTitle><View className="flex-row flex-wrap gap-2">
        {roomCameras.map(camera => <View key={camera.id} className="w-[160px]"><RealCameraCard camera={camera} height={120} width={160}/></View>)}
      </View></View>
    ))}
  </SectionGrid></PageScroll><AddButton onPress={() => setSheet({ kind: 'menu', title: 'Add to your home', options: [
    { label: 'Set up a device', description: 'UI demonstration only', onPress: () => setSheet({ kind: 'message', title: 'Set up a device', description: 'Connect your own smart-home API here. This recreation does not discover or pair physical devices.' }) },
    { label: 'Create an automation', onPress: () => { setSheet(null); onNavigate('composer'); } },
  ] })}/></View>;
}
