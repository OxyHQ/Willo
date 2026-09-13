import { colors, Icon, Label } from '@willo/ui';
import React from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Navigate, type ScreenId } from '../data/screens';
import { modernTabs, classicTabs, isNavigationActive } from './navigation-items';
export function BottomNav({ screen, onNavigate, modern }: { screen: ScreenId; onNavigate: Navigate; modern: boolean }) {
  const insets = useSafeAreaInsets();
  return <View testID="bottom-navigation" className="bg-home-nav px-1 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
    <View accessibilityRole="tablist" className="flex-row">{(modern ? modernTabs : classicTabs).map(tab => {
      const active = isNavigationActive(screen, tab.screen);
      return <Pressable accessibilityRole="tab" accessibilityState={{ selected: active }} accessibilityLabel={tab.title} key={tab.screen} onPress={() => onNavigate(tab.screen)} className="min-h-[49px] flex-1 items-center gap-1 active:opacity-60"><View className={`h-[28px] w-[53px] items-center justify-center rounded-full ${active ? 'bg-home-sky' : ''}`}><Icon name={tab.icon} size={modern ? 21 : 19} color={active ? colors.onSky : colors.muted} filled={active}/></View><Label className={`max-w-full text-center ${modern ? 'text-[11px]' : 'text-[9px]'} ${active ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{tab.title}</Label></Pressable>;
    })}</View>
  </View>;
}
