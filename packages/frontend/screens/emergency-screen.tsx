import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { CameraCard } from '../components/camera-card';
import { Icon } from '@willo/ui';
import { IconButton, Label } from '@willo/ui';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { colors } from '@willo/ui';
export function EmergencyScreen({ onNavigate }: ScreenProps) {
  const { state, dispatch, setSheet } = useHome();
  const [width, setWidth] = useState(320);
  const [page, setPage] = useState(0);
  return <View className="flex-1 bg-white" onLayout={event => setWidth(event.nativeEvent.layout.width)}><View className="items-start px-2"><IconButton icon="close" label="Close smoke alert demo" onPress={() => onNavigate('home')}/></View><ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false} className="flex-1" contentContainerStyle={{ paddingBottom: 24 }}>
    <Label className="px-4 pb-5 pt-1 text-[21px] leading-[29px]">Emergency · Smoke detected</Label><View className="mx-4 mb-4 flex-row items-center gap-3 rounded-full bg-home-surface px-3 py-3"><Icon name="alert" size={20} color={colors.red}/><Label className="flex-1 text-[12px]">Check what’s happening. Use caution.</Label></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={Math.max(230, width - 46) + 10} decelerationRate="fast" onScroll={event => setPage(Math.round(event.nativeEvent.contentOffset.x / (Math.max(230, width - 46) + 10)))} scrollEventThrottle={80} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}><CameraCard height={176} width={Math.max(230, width - 46)}/><CameraCard garden height={176} width={Math.max(230, width - 46)}/></ScrollView>
    <View className="flex-row justify-center gap-2 py-4">{[0, 1].map(index => <View key={index} className={`h-1.5 w-1.5 rounded-full ${page === index ? 'bg-home-muted' : 'bg-home-border'}`}/>)}</View>
    <View className="gap-2 px-4"><Pressable accessibilityRole="button" accessibilityLabel={state.kitchenSilenced ? 'Restore kitchen demo alarm sound' : 'Silence kitchen demo alarm'} onPress={() => dispatch({ type: 'TOGGLE_SILENCE' })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-home-surface px-4"><Icon name="waves" size={21}/><View className="flex-1"><Label className="text-[13px]">Kitchen</Label><Label className="mt-0.5 text-[11px]">{state.kitchenSilenced ? 'Silenced' : 'Alarm sounding · Demo'}</Label></View><Icon name={state.kitchenSilenced ? 'volume-off' : 'speaker'} size={20}/></Pressable><Pressable accessibilityRole="button" onPress={() => setSheet({ kind: 'message', title: 'Dining room', description: 'Smoke alarm no longer heard. This is a sample state from the reference, not a connected sensor.' })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-home-surface px-4"><Icon name="climate" size={21}/><View className="flex-1"><Label className="text-[13px]">Dining room</Label><Label className="mt-0.5 text-[11px]">Smoke alarm no longer heard</Label></View></Pressable></View>
    <Label className="mt-8 px-5 text-center text-[11px] leading-[17px] text-home-muted">Demo alert · No smoke sensors are connected.</Label>
  </ScrollView></View>;
}
