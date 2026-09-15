import React from 'react';
import { View } from 'react-native';
import { PageScroll, SectionGrid } from '../layout/page-layout';
import { AddButton, SectionTitle, Tile, useOptimisticValue } from '@willo/ui';
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
/**
 * A real light's `subtitle`/`tone`/`active` are all derived from the SAME
 * `percent` that drives the fill — dragging moves all three together instead
 * of the fill alone updating while the "On · X%" text sits frozen on the
 * pre-drag value. Its own component (not a plain helper called in a `.map`,
 * like `device` below): `useOptimisticValue` is a hook, and a real list of
 * lights is exactly the dynamic-length loop that breaks the rules of hooks
 * when a hook is called from a plain function instead of a component.
 */
function LightTile({ light }: { light: Device }) {
  const { setSheet, sendCommand } = useHome();
  const onOff = getCapability(light, 'onOff');
  const brightnessCapability = getCapability(light, 'brightness');
  // Not every light HA reports is dimmable — a plain on/off light has no
  // `brightness` capability at all, and gets no slider (`brightness`/
  // `onBrightnessChange` both left `undefined`) rather than one that always
  // reads 100%.
  const dimmable = brightnessCapability !== undefined;
  const [percent, setPercent] = useOptimisticValue(dimmable ? (onOff?.on ? brightnessCapability.percent ?? 100 : 0) : 0);
  const on = dimmable ? percent > 0 : (onOff?.on ?? false);
  return <Tile title={light.name}
    subtitle={on ? (dimmable ? `On · ${percent}%` : 'On') : 'Off'}
    icon="light" tone={on ? 'yellow' : 'neutral'} active={on}
    brightness={dimmable ? percent : undefined}
    onBrightnessChange={dimmable ? next => { setPercent(next); sendCommand(light.id, next === 0 ? { kind: 'setOnOff', on: false } : { kind: 'setBrightness', percent: next }); } : undefined}
    onPress={() => sendCommand(light.id, { kind: 'setOnOff', on: !onOff?.on })}
    onLongPress={() => setSheet({ kind: 'realDevice', title: light.name, device: light })}/>;
}
/** Same reasoning as `LightTile` above, for the demo's own local `living-lamp`/`office-lamp` — shared with `home-screen.tsx`'s demo-mode dashboard, which needs the exact same tile for the exact same demo devices. */
export function DemoLightTile({ id, title }: { id: DeviceKey; title: string }) {
  const { state, dispatch, setSheet } = useHome();
  const [percent, setPercent] = useOptimisticValue(state.devices[id] ? state.brightness[id] : 0);
  return <Tile title={title}
    subtitle={percent > 0 ? `On · ${percent}%` : 'Off'}
    icon="light" tone={percent > 0 ? 'yellow' : 'neutral'} active={percent > 0}
    brightness={percent}
    onBrightnessChange={next => { setPercent(next); dispatch({ type: 'SET_BRIGHTNESS', id, value: next }); }}
    onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id })}
    onLongPress={() => setSheet({ kind: 'device', title, id })}/>;
}
export function DevicesScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, setSheet, devices, demoMode } = useHome();
  const device = (id: DeviceKey, title: string, icon: IconName) => <Tile key={id} title={title} subtitle={id.includes('blinds') ? state.devices[id] ? 'Open' : 'Closed' : id === 'vacuum' ? state.devices[id] ? 'Running' : 'Paused' : state.devices[id] ? id === 'tv' ? `On · ${state.brightness[id] ?? 50}%` : 'On' : 'Off'} icon={icon} tone={state.devices[id] || id.includes('blinds') ? 'blue' : 'neutral'} active={state.devices[id]} onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id })} onLongPress={id === 'tv' ? () => setSheet({ kind: 'device', title, id }) : undefined}/>;
  // Demo mode never mixes with real devices — see `useHome()`'s `demoMode`
  // doc comment. Real Home Assistant devices are grouped by their actual
  // room below; the fixed Front room/Living room/Office sections above them
  // are the demo catalog and only ever appear on their own.
  const lightsByRoom = demoMode ? new Map<string, Device[]>() : groupByRoom(devices.filter(d => d.domain === 'light'));
  const camerasByRoom = demoMode ? new Map<string, Device[]>() : groupByRoom(devices.filter(d => d.domain === 'camera'));
  return <View className="flex-1 bg-card"><PageScroll bottom={96}>{header}<SectionGrid>
    {demoMode && <>
      <View><SectionTitle>Front room</SectionTitle><View className="flex-row gap-2">{device('tv', 'TV', 'tv')}<Tile title="Thermostat" subtitle="Indoor 70°" icon="thermometer" tone="peach" chevron onPress={() => onNavigate('home')}/></View>
      </View><View><SectionTitle>Living room</SectionTitle><View className="gap-2"><View className="flex-row gap-2"><DemoLightTile id="living-lamp" title="Lamp"/><Tile title="Camera" icon="camera" tone="blue" chevron onPress={() => setSheet({ kind: 'camera', title: 'Living room camera' })}/></View><View className="flex-row gap-2">{device('blinds', 'Blinds', 'blinds')}{device('vacuum', 'Vacuum', 'vacuum')}</View></View>
      </View><View><SectionTitle>Office</SectionTitle><View className="gap-2"><View className="flex-row gap-2">{device('plug', 'Smart plug', 'plug')}<DemoLightTile id="office-lamp" title="Lamp"/></View><View className="flex-row gap-2">{device('office-blinds', 'Blinds', 'blinds')}<View className="flex-1"/></View></View>
      </View>
    </>}
    {[...lightsByRoom.entries()].map(([room, roomLights]) => (
      <View key={`lights-${room}`}><SectionTitle>{room} lights</SectionTitle><View className="gap-2">
        {chunkPairs(roomLights).map((pair, index) => <View key={index} className="flex-row gap-2">{pair.map(light => <LightTile key={light.id} light={light}/>)}{pair.length === 1 && <View className="flex-1"/>}</View>)}
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
