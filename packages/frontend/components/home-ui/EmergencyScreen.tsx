import { useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { GARDEN_IMAGE } from './fixtures';
import { CameraCard, Icon, IconButton } from './Primitives';
import type { ScreenProps } from './types';

export function EmergencyScreen({ onNavigate }: ScreenProps) {
  const [isSilenced, setIsSilenced] = useState(true);
  const [cameraIndex, setCameraIndex] = useState(0);
  const cameraRef = useRef<ScrollView>(null);
  return <ScrollView className="flex-1 bg-white" contentContainerClassName="pb-8" showsVerticalScrollIndicator={false}>
    <View className="px-3 pt-2"><IconButton icon="close" label="Close sample alert" onPress={() => onNavigate('home', true)} /></View>
    <View className="gap-4 px-4 pb-4">
      <Text accessibilityRole="header" className="text-xl leading-7 text-willo-ink">Emergency · Smoke detected</Text>
      <View className="flex-row items-center gap-3 rounded-full bg-willo-surface px-4 py-3"><Icon name="warning" color="#b3261e" size={20} />
        <Text className="flex-1 text-xs leading-5 text-willo-secondary">Check what’s happening. Use caution.</Text></View>
      <Text className="text-[11px] text-willo-secondary">Sample alert · No smoke detector is connected.</Text>
    </View>
    <ScrollView ref={cameraRef} horizontal showsHorizontalScrollIndicator={false} snapToInterval={304} decelerationRate="fast"
      contentContainerClassName="gap-[8px] px-[16px]" scrollEventThrottle={32}
      onScroll={(event) => setCameraIndex(Math.min(1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / 304))))}>
      <View className="w-[296px]"><CameraCard /></View>
      <View className="w-[296px]"><CameraCard source={GARDEN_IMAGE} /></View>
    </ScrollView>
    <View className="my-1 flex-row items-center justify-center">
      {[0, 1].map((index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`Show camera ${index + 1}`}
        accessibilityState={{ selected: cameraIndex === index }} onPress={() => cameraRef.current?.scrollTo({ x: index * 304, animated: true })}
        className="h-[44px] w-[44px] items-center justify-center"><View className={`h-[6px] w-[6px] rounded-full ${cameraIndex === index ? 'bg-willo-secondary' : 'bg-willo-muted'}`} /></Pressable>)}
    </View>
    <View className="gap-2 px-4">
      <View className="min-h-[90px] flex-row items-center gap-3 rounded-[24px] bg-willo-surface p-4">
        <Icon name="radio-outline" /><View className="flex-1"><Text className="text-sm text-willo-ink">Kitchen</Text>
          <Text accessibilityLiveRegion="polite" className="mt-1 text-xs text-willo-secondary">{isSilenced ? 'Silenced' : 'Sound enabled (preview)'}</Text></View>
        <IconButton icon={isSilenced ? 'volume-mute-outline' : 'volume-high-outline'} label={isSilenced ? 'Enable sample alarm sound state' : 'Silence sample alarm state'}
          className="bg-transparent" onPress={() => setIsSilenced(!isSilenced)} />
      </View>
      <View className="min-h-[90px] flex-row items-center gap-3 rounded-[24px] bg-willo-surface p-4">
        <Icon name="pulse-outline" /><View className="flex-1"><Text className="text-sm text-willo-ink">Dining room</Text>
          <Text className="mt-1 text-xs text-willo-secondary">Smoke alarm no longer heard</Text></View>
      </View>
    </View>
  </ScrollView>;
}
