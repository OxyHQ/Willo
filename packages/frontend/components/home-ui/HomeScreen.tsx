import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GARDEN_IMAGE } from './fixtures';
import { ActionTile, CameraCard, Header, Icon, IconButton, SectionTitle, Sheet } from './Primitives';
import { DeviceTile } from './DeviceTile';
import { TONES, type IconName, type ScreenProps, type Tone } from './types';

export function HomeScreen({ onNavigate, classic = false }: ScreenProps & { classic?: boolean }) {
  const [temperature, setTemperature] = useState(68);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const categories: { title: string; icon: IconName; tone: Tone; subtitle: string }[] = [
    { title: 'Cameras', icon: 'videocam-outline', tone: 'blue', subtitle: '3 cameras' },
    { title: 'Lighting', icon: 'bulb-outline', tone: 'yellow', subtitle: '12 lights' },
    { title: 'Climate', icon: 'thermometer-outline', tone: 'peach', subtitle: '2 devices' },
    { title: 'Wi-Fi', icon: 'wifi-outline', tone: 'green', subtitle: '2 devices' },
  ];
  return <View className="flex-1 bg-white">
    <Header onNavigate={onNavigate} classic={classic} />
    <ScrollView className="flex-1" contentContainerClassName="pb-6" showsVerticalScrollIndicator={false}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4 pb-3 pt-1">
        {classic ? categories.map((category) => <Pressable key={category.title} onPress={() => onNavigate('devices')}
          accessibilityRole="button" accessibilityLabel={`${category.title}, ${category.subtitle}`}
          className={`min-h-[104px] w-[106px] justify-between rounded-[24px] p-4 active:opacity-70 ${TONES[category.tone].background}`}>
          <Icon name={category.icon} color={TONES[category.tone].icon} size={21} />
          <View><Text className="text-xs font-medium text-willo-ink">{category.title}</Text>
            <Text className="mt-1 text-[10px] text-willo-secondary">{category.subtitle}</Text></View>
        </Pressable>) : <>
          <View className="h-14 flex-row items-center justify-center gap-2 rounded-[20px] bg-willo-sky px-5">
            <Icon name="heart" color="#005478" /><Text className="text-base font-semibold text-willo-on-sky">Favorites</Text>
          </View>
          {(['apps-outline', 'videocam-outline', 'bulb-outline', 'wifi-outline'] as const).map((icon, index) => (
            <Pressable key={icon} onPress={() => onNavigate('devices')} accessibilityRole="button"
              accessibilityLabel={['All devices', 'Cameras', 'Lighting', 'Wi-Fi'][index]}
              className="h-14 w-14 items-center justify-center rounded-full bg-willo-surface active:opacity-70">
              <Icon name={icon} size={25} />
            </Pressable>
          ))}
        </>}
      </ScrollView>
      <View className="gap-2 px-4">
        {classic && <>
          <SectionTitle>Favorites</SectionTitle>
          <View className="flex-row gap-2">
            <ActionTile title="Broadcast" icon="megaphone-outline" onPress={() => setIsBroadcastOpen(true)} />
            <ActionTile title="Assistant" icon="mic-outline" onPress={() => onNavigate('ask')} />
          </View>
        </>}
        <CameraCard source={classic ? GARDEN_IMAGE : undefined} label={classic ? 'Backyard' : undefined} onPress={() => setIsCameraOpen(true)} />
        {classic ? <>
          <View className="flex-row gap-2">
            <DeviceTile device={{ id: 'pantry', name: 'Kitchen pantry light', status: 'On · 50%', inactiveStatus: 'Off', icon: 'bulb', tone: 'yellow', isActive: true, brightness: 50 }} />
            <ActionTile title="Movie mode" icon="sparkles-outline" onPress={() => onNavigate('routines')} />
          </View>
          <View className="flex-row gap-2">
            <DeviceTile device={{ id: 'blinds', name: 'Living room blinds', status: 'Closed', inactiveStatus: 'Open', icon: 'albums-outline', tone: 'blue', isActive: false }} />
            <DeviceTile device={{ id: 'vacuum', name: 'Vacuum', status: 'Running', inactiveStatus: 'Paused', icon: 'disc-outline', tone: 'blue', isActive: true }} />
          </View>
          <View className="flex-row gap-2">
            <ActionTile title="Hallway thermostat" subtitle="Indoor 70°" icon="thermometer-outline" tone="peach" onPress={() => onNavigate('home')} />
            <DeviceTile device={{ id: 'front-door', name: 'Front door lock', status: 'Locked', inactiveStatus: 'Unlocked', icon: 'lock-closed', tone: 'blue', isActive: true }} />
          </View>
        </> : <>
          <View className="flex-row gap-2">
            <DeviceTile device={{ id: 'front-door', name: 'Front door lock', status: 'Locked', inactiveStatus: 'Unlocked', icon: 'lock-closed', tone: 'blue', isActive: true }} />
            <DeviceTile device={{ id: 'light', name: 'Light', status: 'On · 50%', inactiveStatus: 'Off', icon: 'bulb', tone: 'yellow', isActive: true, brightness: 50 }} />
          </View>
          <View className="min-h-[208px] justify-between rounded-[30px] bg-willo-peach p-4">
            <View className="flex-row items-center gap-3"><Icon name="flame-outline" color="#8b3000" />
              <Text className="flex-1 text-sm font-medium text-willo-on-peach">Downstairs</Text>
              <Icon name="chevron-forward" size={19} color="#8b3000" />
            </View>
            <View className="mt-5 flex-row items-center justify-between gap-3">
              <IconButton icon="remove" label="Decrease target temperature" disabled={temperature <= 50}
                onPress={() => setTemperature(Math.max(50, temperature - 1))} className="bg-willo-peach-strong" color="#8b3000" />
              <Text accessibilityLabel={`Target temperature ${temperature} degrees Fahrenheit`} accessibilityLiveRegion="polite"
                className="text-[64px] font-normal leading-[76px] text-willo-on-peach">{temperature}</Text>
              <IconButton icon="add" label="Increase target temperature" disabled={temperature >= 90}
                onPress={() => setTemperature(Math.min(90, temperature + 1))} className="bg-willo-peach-strong" color="#8b3000" />
            </View>
            <Text className="mb-3 text-center text-sm font-medium text-willo-on-peach">Comfort</Text>
          </View>
          <View className="flex-row gap-2">
            <View className="min-w-0 flex-1 flex-row items-center gap-3 rounded-[24px] bg-willo-faint p-4">
              <Icon name="sunny-outline" size={25} /><View className="flex-1"><Text className="text-xs text-willo-ink">San Francisco</Text>
                <Text className="mt-1 text-xs text-willo-ink">56° · Clear</Text></View>
            </View>
            <View className="min-w-0 flex-1 flex-row items-center gap-3 rounded-[24px] bg-willo-faint p-4">
              <Icon name="water-outline" size={25} /><View className="flex-1"><Text className="text-xs text-willo-ink">Outdoor AQI</Text>
                <Text className="mt-1 text-xs text-willo-ink">32 · Good</Text></View>
            </View>
          </View>
        </>}
      </View>
    </ScrollView>
    <Sheet visible={isCameraOpen} onClose={() => setIsCameraOpen(false)} title={classic ? 'Backyard' : 'Living room'}>
      <CameraCard source={classic ? GARDEN_IMAGE : undefined} />
      <Text className="mt-4 text-sm text-willo-secondary">Sample image only. No camera is connected.</Text>
    </Sheet>
    <Sheet visible={isBroadcastOpen} onClose={() => setIsBroadcastOpen(false)} title="Broadcast">
      <View className="items-center gap-4 rounded-[28px] bg-willo-surface p-8"><Icon name="megaphone-outline" size={42} />
        <Text className="text-center text-base text-willo-ink">Broadcast to your home</Text>
        <Text className="text-center text-sm leading-5 text-willo-secondary">Microphone and speaker controls are not connected in this preview.</Text>
      </View>
    </Sheet>
  </View>;
}
