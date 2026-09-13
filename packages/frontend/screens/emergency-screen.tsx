import { Icon, IconButton, Label, colors } from '@willo/ui';
import React, { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { PageScroll, ContentWidth } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import { CameraCard } from '../components/camera-card';
import { type ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
export function EmergencyScreen({ onNavigate }: ScreenProps) {
  const { state, dispatch, setSheet } = useHome();
  const { compact, gutter } = useResponsiveLayout();
  const [width, setWidth] = useState(320);
  const [page, setPage] = useState(0);
  const cameraWidth = compact ? Math.max(230, width - 46) : Math.max(100, (Math.min(width, 1200) - gutter * 2 - 12) / 2);
  return <View className="flex-1 bg-white" onLayout={event => setWidth(event.nativeEvent.layout.width)}><ContentWidth maxWidth={1200}><View className="items-start pt-3"><IconButton icon="close" label="Close smoke alert demo" onPress={() => onNavigate('home')}/></View></ContentWidth><PageScroll maxWidth={1200}>
    <Label className="pb-5 pt-1 text-[21px] leading-[29px]">Emergency · Smoke detected</Label><View className="mb-4 flex-row items-center gap-3 rounded-full bg-home-surface px-3 py-3"><Icon name="alert" size={20} color={colors.red}/><Label className="flex-1 text-[12px]">Check what’s happening. Use caution.</Label></View>
    <ScrollView horizontal scrollEnabled={compact} showsHorizontalScrollIndicator={false} snapToInterval={compact ? cameraWidth + 12 : undefined} decelerationRate="fast" onScroll={event => setPage(Math.round(event.nativeEvent.contentOffset.x / (cameraWidth + 12)))} scrollEventThrottle={80} contentContainerStyle={{ gap: 12 }}><CameraCard height={compact ? 176 : 300} width={cameraWidth}/><CameraCard garden height={compact ? 176 : 300} width={cameraWidth}/></ScrollView>
    {compact && <View className="flex-row justify-center gap-2 py-4">{[0, 1].map(index => <View key={index} className={`h-1.5 w-1.5 rounded-full ${page === index ? 'bg-home-muted' : 'bg-home-border'}`}/>)}</View>}
    <View className="mt-4 gap-2"><Pressable accessibilityRole="button" accessibilityLabel={state.kitchenSilenced ? 'Restore kitchen demo alarm sound' : 'Silence kitchen demo alarm'} onPress={() => dispatch({ type: 'TOGGLE_SILENCE' })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-home-surface px-4"><Icon name="waves" size={21}/><View className="flex-1"><Label className="text-[13px]">Kitchen</Label><Label className="mt-0.5 text-[11px]">{state.kitchenSilenced ? 'Silenced' : 'Alarm sounding · Demo'}</Label></View><Icon name={state.kitchenSilenced ? 'volume-off' : 'speaker'} size={20}/></Pressable><Pressable accessibilityRole="button" onPress={() => setSheet({ kind: 'message', title: 'Dining room', description: 'Smoke alarm no longer heard. This is a sample state from the reference, not a connected sensor.' })} className="min-h-[82px] flex-row items-center gap-3 rounded-[24px] bg-home-surface px-4"><Icon name="climate" size={21}/><View className="flex-1"><Label className="text-[13px]">Dining room</Label><Label className="mt-0.5 text-[11px]">Smoke alarm no longer heard</Label></View></Pressable></View>
    <Label className="mt-8 px-5 text-center text-[11px] leading-[17px] text-home-muted">Demo alert · No smoke sensors are connected.</Label>
  </PageScroll></View>;
}
