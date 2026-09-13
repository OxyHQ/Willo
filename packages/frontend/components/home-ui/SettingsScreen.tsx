import { useState } from 'react';
import { Pressable, ScrollView, Switch, Text, View } from 'react-native';
import { Header, Icon, IconButton, SectionTitle, Sheet } from './Primitives';
import type { IconName, ScreenProps } from './types';

export function SettingsScreen({ onNavigate }: ScreenProps) {
  const [selectedSetting, setSelectedSetting] = useState<string | null>(null);
  const [hasNotifications, setHasNotifications] = useState(true);
  const [hasPresenceSensing, setHasPresenceSensing] = useState(false);
  const deviceTiles: { title: string; icon: IconName }[] = [
    { title: 'Hallway thermostat', icon: 'thermometer-outline' },
    { title: 'Front door lock', icon: 'lock-closed-outline' },
    { title: 'Office Wi-Fi', icon: 'wifi-outline' },
  ];
  const serviceTiles: { title: string; icon: IconName }[] = [
    { title: 'Security', icon: 'shield-checkmark-outline' },
    { title: 'Works with Willo', icon: 'link-outline' },
    { title: 'Video', icon: 'play-circle-outline' },
  ];
  return <View className="flex-1 bg-white">
    <Header title="Settings" onNavigate={onNavigate} />
    <ScrollView className="flex-1" contentContainerClassName="px-4 pb-8" showsVerticalScrollIndicator={false}>
      <Pressable accessibilityRole="button" onPress={() => setSelectedSetting('Home details')} className="mt-3 flex-row items-center justify-between py-2">
        <View><Text className="text-2xl text-willo-ink">156 Waller</Text><Text className="mt-2 text-xs text-willo-secondary">156 Waller Street</Text></View>
        <View className="h-7 w-7 items-center justify-center rounded-full bg-willo-surface"><Icon name="chevron-forward" size={16} /></View>
      </Pressable>
      <View className="mt-3 flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-willo-peach"><Text className="text-xs text-willo-on-peach">W</Text></View>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-willo-sky"><Text className="text-xs text-willo-on-sky">L</Text></View>
        <IconButton label="Add home member preview" icon="add" className="bg-willo-surface" onPress={() => setSelectedSetting('Home members')} />
      </View>
      <SectionTitle action={<IconButton icon="chevron-forward" label="View devices, groups and rooms" className="bg-willo-surface" onPress={() => onNavigate('devices')} />}>Devices, groups & rooms</SectionTitle>
      <View className="flex-row gap-2">{deviceTiles.map((tile) => <Pressable key={tile.title} onPress={() => onNavigate(tile.title === 'Hallway thermostat' ? 'home' : 'devices')}
        accessibilityRole="button" className="min-h-[108px] min-w-0 flex-1 justify-between rounded-[24px] bg-willo-surface p-4 active:opacity-60">
        <Icon name={tile.icon} size={20} /><Text className="mt-4 text-xs leading-4 text-willo-ink">{tile.title}</Text>
      </Pressable>)}</View>
      <SectionTitle action={<IconButton icon="chevron-forward" label="View services preview" className="bg-willo-surface" onPress={() => setSelectedSetting('Services')} />}>Services</SectionTitle>
      <View className="flex-row gap-2">{serviceTiles.map((tile) => <Pressable key={tile.title} onPress={() => setSelectedSetting(tile.title)} accessibilityRole="button"
        className="min-h-[108px] min-w-0 flex-1 justify-between rounded-[24px] bg-willo-surface p-4 active:opacity-60">
        <Icon name={tile.icon} size={20} /><Text className="mt-4 text-xs leading-4 text-willo-ink">{tile.title}</Text>
      </Pressable>)}</View>
      <SectionTitle>Home features</SectionTitle>
      <View className="rounded-[24px] bg-willo-surface px-4">
        <View className="min-h-16 flex-row items-center gap-3"><Icon name="notifications-outline" />
          <Text className="flex-1 text-sm text-willo-ink">Notifications</Text><Switch accessibilityLabel="Preview notifications" value={hasNotifications} onValueChange={setHasNotifications} trackColor={{ false: '#dce1e8', true: '#bfe7fc' }} thumbColor="#ffffff" /></View>
        <View className="min-h-16 flex-row items-center gap-3"><Icon name="people-outline" />
          <Text className="flex-1 text-sm text-willo-ink">Presence sensing</Text><Switch accessibilityLabel="Preview presence sensing" value={hasPresenceSensing} onValueChange={setHasPresenceSensing} trackColor={{ false: '#dce1e8', true: '#bfe7fc' }} thumbColor="#ffffff" /></View>
      </View>
      <SectionTitle>Screen previews</SectionTitle>
      {([['emergency', 'Smoke alert', 'warning-outline'], ['create-automation', 'Automation editor', 'create-outline'], ['home', 'Current home layout', 'home-outline']] as const).map(([screen, title, icon]) => <Pressable key={screen}
        onPress={() => onNavigate(screen)} accessibilityRole="button" className="min-h-14 flex-row items-center gap-3 rounded-xl px-3 active:bg-willo-surface">
        <Icon name={icon} /><Text className="flex-1 text-sm text-willo-ink">{title}</Text><Icon name="chevron-forward" size={17} />
      </Pressable>)}
    </ScrollView>
    <Sheet visible={selectedSetting !== null} title={selectedSetting ?? 'Settings'} onClose={() => setSelectedSetting(null)}>
      <Text className="text-sm leading-6 text-willo-secondary">This is a settings interface preview. No home details, memberships, permissions or service connections will be changed.</Text>
    </Sheet>
  </View>;
}
