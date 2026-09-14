import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClaimBottomEdge } from '@oxy.so/bloom/layout';
import { TabBar, TabBarButton, type TabBarItem, type TabBarTheme } from '@oxy.so/bloom/tab-bar';
import { type Navigate, type ScreenId } from '../data/screens';
import { asViewStyle } from '../layout/web-style';
import { colors } from '@willo/ui';
import { Icon } from '@willo/ui';
import { modernTabs, classicTabs, isNavigationActive } from './navigation-items';

const IS_WEB = Platform.OS === 'web';
const ICON_SIZE = 21;

// Matches Willo's own `home-sky`/`onSky`/`muted` palette instead of Bloom's
// generic default, so the bar reads as part of this app rather than a
// dropped-in component with its own colors.
const WILLO_TAB_BAR_THEME: Partial<TabBarTheme> = {
  activeTint: colors.onSky,
  inactiveTint: colors.muted,
  highlight: colors.sky,
};

// POSITIONING: under document-scroll on web (see `app/_layout.tsx`), a plain
// flow sibling lands at the end of a tall scrolling document instead of the
// window's bottom edge, so it must pin itself with `position: fixed` instead
// — matching OxyHQ/Mention's `components/BottomBar.tsx`. NATIVE stays a plain
// flow sibling, which already reserves its own space.
const webFixedStyle = IS_WEB
  ? asViewStyle({ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000 })
  : undefined;

export function BottomNav({ screen, onNavigate, modern }: { screen: ScreenId; onNavigate: Navigate; modern: boolean }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const tabs = modern ? modernTabs : classicTabs;
  const activeIndex = tabs.findIndex(tab => isNavigationActive(screen, tab.screen));

  // Claims its own footprint (Bloom's bottom-edge registry) on web, where it
  // floats fixed, so a screen's own content can pad itself clear of it
  // instead of rendering underneath it. A no-op on native, where it's a plain
  // flow sibling that already reserves its own space.
  useClaimBottomEdge(IS_WEB ? height : 0);

  return <View testID="bottom-navigation" className="bg-home-nav px-1 pt-2"
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[webFixedStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    <TabBar activeIndex={activeIndex} onIndexChange={index => onNavigate(tabs[index].screen)} theme={WILLO_TAB_BAR_THEME}>
      {tabs.map((tab, index) => {
        const item: TabBarItem = {
          name: tab.screen,
          label: tab.title,
          icon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.muted}/>,
          activeIcon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.onSky} filled/>,
        };
        return <TabBarButton key={tab.screen} item={item} index={index}/>;
      })}
    </TabBar>
  </View>;
}
