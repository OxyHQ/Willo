import React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import type { Navigate, ScreenId } from '../data/screens';
import { useResponsiveLayout } from '../layout/responsive-context';
import { asViewStyle } from '../layout/web-style';
import { colors } from '@willo/ui';
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';
import { classicTabs, isNavigationActive, modernTabs } from './navigation-items';

// Under document-scroll on web (see `app/_layout.tsx`), the shell row is a
// tall flex container. A flex child defaults to `align-items: stretch`, which
// would stretch this column to the row's full (scrollable) height — leaving
// the sticky box nowhere to move, so it scrolls away with the document.
// `alignSelf: 'flex-start'` constrains the box to its own `100vh` height,
// sitting at the top of the tall row, so `position: sticky; top: 0` pins it
// while only the content column scrolls — the exact technique (and reasoning)
// OxyHQ/Mention's `components/SideBar/index.tsx` uses for the same shell shape.
const webStickyStyle = Platform.OS === 'web'
  ? asViewStyle({ position: 'sticky', top: 0, alignSelf: 'flex-start', overflow: 'hidden', height: '100vh' })
  : undefined;

export function NavigationRail({ screen, onNavigate, modern }: { screen: ScreenId; onNavigate: Navigate; modern: boolean }) {
  const { navigationWidth } = useResponsiveLayout();
  return <View testID="navigation-rail" className="h-full shrink-0 bg-home-surface" style={[webStickyStyle, { width: navigationWidth }]}>
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 24, gap: 8 }}>
      {(modern ? modernTabs : classicTabs).map(item => {
        const active = isNavigationActive(screen, item.screen);
        return <Pressable key={item.screen} accessibilityRole="tab" accessibilityLabel={item.title}
          accessibilityState={{ selected: active }} onPress={() => onNavigate(item.screen)}
          className="min-h-[64px] items-center rounded-[20px] py-2 active:opacity-60"
          style={{ flexDirection: 'column', gap: 5, paddingHorizontal: 0 }}>
          <View className={`h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-home-sky' : ''}`}>
            <Icon name={item.icon} size={22} color={active ? colors.onSky : colors.muted} filled={active}/>
          </View>
          <Label className={`max-w-full text-center text-[10px] ${active ? 'font-medium text-home-on-sky' : 'text-home-muted'}`}>{item.title}</Label>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
