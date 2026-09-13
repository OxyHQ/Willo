import { colors, Icon, Label } from '@willo/ui';
import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import type { Navigate, ScreenId } from '../data/screens';
import { useResponsiveLayout } from '../layout/responsive-context';
import { classicTabs, isNavigationActive, modernTabs } from './navigation-items';

export function NavigationRail({ screen, onNavigate, modern }: { screen: ScreenId; onNavigate: Navigate; modern: boolean }) {
  const { navigationWidth, sidebar } = useResponsiveLayout();
  return <View testID="navigation-rail" className="h-full shrink-0 bg-home-surface" style={{ width: navigationWidth }}>
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 24, gap: 8 }}>
      {(modern ? modernTabs : classicTabs).map(item => {
        const active = isNavigationActive(screen, item.screen);
        return <Pressable key={item.screen} accessibilityRole="tab" accessibilityLabel={item.title}
          accessibilityState={{ selected: active }} onPress={() => onNavigate(item.screen)}
          className={`min-h-[64px] items-center rounded-[20px] py-2 active:opacity-60 ${sidebar && active ? 'bg-home-sky' : ''}`}
          style={{ flexDirection: sidebar ? 'row' : 'column', gap: sidebar ? 12 : 5, paddingHorizontal: sidebar ? 12 : 0 }}>
          <View className={`h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-home-sky' : ''}`}>
            <Icon name={item.icon} size={22} color={active ? colors.onSky : colors.muted} filled={active}/>
          </View>
          <Label className={`${sidebar ? 'min-w-0 flex-1 text-[13px]' : 'max-w-full text-center text-[10px]'} ${active ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{item.title}</Label>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
