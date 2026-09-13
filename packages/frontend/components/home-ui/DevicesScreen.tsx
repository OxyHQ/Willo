import { ScrollView, View } from 'react-native';
import { ROOMS } from './fixtures';
import { DeviceTile } from './DeviceTile';
import { Header, SectionTitle } from './Primitives';
import type { ScreenProps } from './types';

export function DevicesScreen({ onNavigate }: ScreenProps) {
  return <View className="flex-1 bg-white">
    <Header title="Devices" onNavigate={onNavigate} />
    <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      {ROOMS.map((room) => <View key={room.name}>
        <SectionTitle>{room.name}</SectionTitle>
        <View className="gap-2">
          {Array.from({ length: Math.ceil(room.devices.length / 2) }, (_, row) => <View key={row} className="flex-row gap-2">
            {room.devices.slice(row * 2, row * 2 + 2).map((device) => <DeviceTile key={device.id} device={device}
              onPress={device.id === 'thermostat' ? () => onNavigate('home') : undefined} />)}
            {row * 2 + 1 >= room.devices.length && <View className="flex-1" />}
          </View>)}
        </View>
      </View>)}
    </ScrollView>
  </View>;
}
