import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Navigate, type ScreenId } from '../data/screens';
import { colors, Icon, type IconName, Label } from '@willo/ui';
type Tab = { screen: ScreenId; title: string; icon: IconName };
const modernTabs: Tab[] = [{ screen: 'home', title: 'Home', icon: 'home' }, { screen: 'activity', title: 'Activity', icon: 'activity' }, { screen: 'automations', title: 'Automations', icon: 'automations' }];
const classicTabs: Tab[] = [{ screen: 'favorites', title: 'Favorites', icon: 'heart' }, { screen: 'devices', title: 'Devices', icon: 'devices' }, { screen: 'routines', title: 'Automations', icon: 'sparkle' }, { screen: 'timeline', title: 'Activity', icon: 'history' }, { screen: 'settings', title: 'Settings', icon: 'settings' }];
export function BottomNav({ screen, onNavigate, modern, preview = false }: { screen: ScreenId; onNavigate: Navigate; modern: boolean; preview?: boolean }) {
  const insets = useSafeAreaInsets();
  return <View className="bg-home-nav px-1 pt-2" style={{ paddingBottom: preview || process.env.EXPO_OS === 'web' ? 8 : Math.max(insets.bottom, 8) }}>
    <View className="flex-row">{(modern ? modernTabs : classicTabs).map(tab => {
      const active = screen === tab.screen || (tab.screen === 'favorites' && screen === 'favorites-assistant');
      return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.title} key={tab.screen} onPress={() => onNavigate(tab.screen)} className="min-h-[49px] flex-1 items-center gap-1 active:opacity-60"><View className={`h-[28px] w-[53px] items-center justify-center rounded-full ${active ? 'bg-home-sky' : ''}`}><Icon name={tab.icon} size={modern ? 21 : 19} color={active ? colors.onSky : colors.muted} filled={active}/></View><Label className={`${modern ? 'text-[11px]' : 'text-[9px]'} ${active ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{tab.title}</Label></Pressable>;
    })}</View>
    {(preview || process.env.EXPO_OS === 'web') && <View className={`mt-2 h-[3px] self-center rounded-full ${modern ? 'w-[94px] bg-home-ink' : 'w-[86px] bg-[#bdc1c6]'}`}/>}
  </View>;
}
