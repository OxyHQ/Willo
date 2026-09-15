import React from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import type { Navigate, ScreenId } from '../data/screens';
import { useResponsiveLayout } from '../layout/responsive-context';
import { asViewStyle } from '../layout/web-style';
import { useTheme } from '@oxy.so/bloom/theme';
import { Icon } from '@willo/ui';
import { Label } from '@willo/ui';
import { isNavigationActive, tabs } from './navigation-items';

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

export function NavigationRail({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const { navigationWidth } = useResponsiveLayout();
  const { colors } = useTheme();
  // No background class at all — `AppShell` (`app/_layout.tsx`) already
  // paints `bg-background` on the shell this rail sits inside, and RN's
  // default is a transparent View, so it shows the SAME background through
  // rather than repainting an equal, redundant one. `card` (real white in
  // light mode) reads better on the RAISED surfaces (ContentPanel, the search
  // pill) than on the rail itself, which should blend into the shell rather
  // than stand apart from it.
  return <View testID="navigation-rail" className="h-full shrink-0" style={[webStickyStyle, { width: navigationWidth }]}>
    <ScrollView className="flex-1" contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 8, paddingVertical: 24, gap: 8 }}>
      {tabs.map(item => {
        const active = isNavigationActive(screen, item.screen);
        return <Pressable key={item.screen} accessibilityRole="tab" accessibilityLabel={item.title}
          accessibilityState={{ selected: active }} onPress={() => onNavigate(item.screen)}
          className="min-h-[64px] items-center rounded-[20px] py-2 active:opacity-60"
          style={{ flexDirection: 'column', gap: 5, paddingHorizontal: 0 }}>
          {/* `primary-subtle`/`primary-text`: Bloom's own fill+legible-text
              pair for a tinted "selected" surface — the same shape as Willo's
              old `home-sky`/`on-sky` pairing, now sourced from the theme. */}
          <View className={`h-8 w-12 items-center justify-center rounded-full ${active ? 'bg-primary-subtle' : ''}`}>
            <Icon name={item.icon} size={22} color={active ? colors.primary : colors.textSecondary} filled={active}/>
          </View>
          <Label className={`max-w-full text-center text-[10px] ${active ? 'font-medium text-primary-text' : 'text-muted-foreground'}`}>{item.title}</Label>
        </Pressable>;
      })}
    </ScrollView>
  </View>;
}
