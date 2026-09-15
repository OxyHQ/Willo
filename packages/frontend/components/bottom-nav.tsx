import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useClaimBottomEdge } from '@oxy.so/bloom/layout';
import { TabBar, TabBarButton, type TabBarItem, type TabBarTheme } from '@oxy.so/bloom/tab-bar';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import { type Navigate, type ScreenId } from '../data/screens';
import { asViewStyle } from '../layout/web-style';
import { Icon } from '@willo/ui';
import { tabs, isNavigationActive } from './navigation-items';

const IS_WEB = Platform.OS === 'web';
const ICON_SIZE = 21;

// POSITIONING: under document-scroll on web (see `app/_layout.tsx`), a plain
// flow sibling lands at the end of a tall scrolling document instead of the
// window's bottom edge, so it must pin itself with `position: fixed` instead
// — matching OxyHQ/Mention's `components/BottomBar.tsx`. NATIVE stays a plain
// flow sibling, which already reserves its own space.
const webFixedStyle = IS_WEB
  ? asViewStyle({ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000 })
  : undefined;

export function BottomNav({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(0);
  const { colors } = useTheme();
  const { t } = useTranslation();
  const activeIndex = tabs.findIndex(tab => isNavigationActive(screen, tab.screen));
  // Sourced from Bloom's own theme instead of Willo's static `home-sky`/
  // `onSky`/`muted` tokens — `highlight` pairs with `activeTint` the same way
  // `primarySubtle`/`primary` do everywhere else in this migration (a tinted
  // "selected" surface + the accent legible on it).
  const tabBarTheme: Partial<TabBarTheme> = {
    activeTint: colors.primary,
    inactiveTint: colors.textSecondary,
    highlight: colors.primarySubtle,
  };

  // Claims its own footprint (Bloom's bottom-edge registry) on web, where it
  // floats fixed, so a screen's own content can pad itself clear of it
  // instead of rendering underneath it. A no-op on native, where it's a plain
  // flow sibling that already reserves its own space.
  useClaimBottomEdge(IS_WEB ? height : 0);

  return <View testID="bottom-navigation" className="bg-background px-1 pt-2"
    onLayout={event => setHeight(event.nativeEvent.layout.height)}
    style={[webFixedStyle, { paddingBottom: Math.max(insets.bottom, 8) }]}>
    <TabBar activeIndex={activeIndex} onIndexChange={index => onNavigate(tabs[index].screen)} theme={tabBarTheme}>
      {tabs.map((tab, index) => {
        const item: TabBarItem = {
          name: tab.screen,
          label: t(tab.titleKey),
          icon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.textSecondary}/>,
          activeIcon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.primary} filled/>,
        };
        return <TabBarButton key={tab.screen} item={item} index={index}/>;
      })}
    </TabBar>
  </View>;
}
