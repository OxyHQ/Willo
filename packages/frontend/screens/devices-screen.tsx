import React, { useMemo } from 'react';
import { View } from 'react-native';
import { PageScroll, SectionGrid } from '../layout/page-layout';
import { AddButton, SectionTitle } from '@willo.sh/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { type Device } from '../providers/types';
import { RealCameraCard } from '../components/camera-card';
import { SensorReadingsCard } from '../components/sensor-readings-card';
import { DeviceTile } from '../components/device-tile';
import { selectRelevantSensors } from '../providers/sensor-readings';
import { useTranslation } from 'react-i18next';

const chunkPairs = <T,>(items: T[]): T[][] =>
  Array.from({ length: Math.ceil(items.length / 2) }, (_, index) => items.slice(index * 2, index * 2 + 2));
const groupByRoom = <T extends { room: string | null }>(items: T[], otherRoomLabel: string): Map<string, T[]> => {
  const byRoom = new Map<string, T[]>();
  for (const item of items) {
    const room = item.room ?? otherRoomLabel;
    const roomItems = byRoom.get(room);
    if (roomItems) roomItems.push(item);
    else byRoom.set(room, [item]);
  }
  return byRoom;
};
/** A camera shows a picture rather than a control, and a reading belongs in the room's readings card — everything else is a tile. */
const CAMERA_DOMAINS = new Set(['camera', 'doorbell']);
const READING_DOMAINS = new Set(['sensor', 'binary_sensor']);

export function DevicesScreen({ onNavigate, header }: ScreenProps) {
  const { setSheet, devices } = useHome();
  const { t } = useTranslation();
  // One pass over the catalogue per device push, not per render: the tunnel
  // replaces `devices` on every Home Assistant state change. Demo mode is a
  // provider (`providers/demo-home.ts`), so there is nothing to branch on —
  // both catalogues arrive here the same way.
  const rooms = useMemo(() => {
    const otherRoom = t('devices.otherRoom');
    const controls = groupByRoom(devices.filter(device => !CAMERA_DOMAINS.has(device.domain) && !READING_DOMAINS.has(device.domain)), otherRoom);
    const cameras = groupByRoom(devices.filter(device => CAMERA_DOMAINS.has(device.domain)), otherRoom);
    const readings = groupByRoom(selectRelevantSensors(devices), otherRoom);
    const names = [...new Set([...controls.keys(), ...cameras.keys(), ...readings.keys()])].sort((first, second) => first.localeCompare(second));
    return names.map(room => ({
      room,
      controls: controls.get(room) ?? ([] as Device[]),
      cameras: cameras.get(room) ?? ([] as Device[]),
      readings: readings.get(room) ?? ([] as Device[]),
    }));
  }, [devices, t]);

  return <View className="flex-1 bg-card"><PageScroll bottom={96}>{header}<SectionGrid>
    {rooms.map(({ room, controls, cameras, readings }) => (
      <View key={room}><SectionTitle>{room}</SectionTitle><View className="gap-2">
        {chunkPairs(controls).map((pair, index) => <View key={`controls-${index}`} className="flex-row gap-2">
          {pair.map(device => <DeviceTile key={device.id} device={device}/>)}
          {pair.length === 1 && <View className="flex-1"/>}
        </View>)}
        {cameras.length > 0 && <View className="flex-row flex-wrap gap-2">
          {cameras.map(camera => <View key={camera.id} className="w-[160px]"><RealCameraCard camera={camera} height={120} width={160}/></View>)}
        </View>}
        {readings.length > 0 && <SensorReadingsCard title={t('devices.readings')} sensors={readings}/>}
      </View></View>
    ))}
  </SectionGrid></PageScroll><AddButton onPress={() => setSheet({ kind: 'menu', title: t('settings.addToHome'), options: [
    { label: t('devices.setUpDevice'), description: t('devices.uiDemoOnly'), onPress: () => setSheet({ kind: 'message', title: t('devices.setUpDevice'), description: t('devices.setUpDeviceDescription') }) },
    { label: t('devices.createAutomation'), onPress: () => { setSheet(null); onNavigate('composer'); } },
  ] })} label={t('common.add')} accessibilityLabel={t('common.addAutomationOrDevice')}/></View>;
}
