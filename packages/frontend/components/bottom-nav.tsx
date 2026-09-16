import React from 'react';
import { Platform, View } from 'react-native';
import { TabBar, TabBarButton, type TabBarItem, type TabBarTheme } from '@oxy.so/bloom/tab-bar';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import { type ScreenId } from '../data/screens';
import { asViewStyle } from '../layout/web-style';
import { Icon } from '@willo.sh/ui';
import { tabs, isNavigationActive } from './navigation-items';
import { useTabPager } from '../state/tab-pager';

const IS_WEB = Platform.OS === 'web';
const ICON_SIZE = 21;

// POSITIONING: Bloom's bar pins ITSELF with `position: absolute` against this
// wrapper and publishes its own footprint (its height plus the gesture bar's
// inset) to the bottom-edge registry, which `screen-surface.tsx` reads back to
// pad content clear of it. So on NATIVE this wrapper is a zero-height flex
// item at the end of the shell column: the bar lands on the window's bottom
// edge and the screen scrolls behind it, all the way past the gesture line.
// It used to be a real, opaque, inset-padded box instead, which is what made
// content stop short of the bottom. On WEB the app scrolls the document, where
// `absolute` would resolve against the tall page and scroll away, so the
// wrapper pins to the viewport and the bar's own `absolute` resolves against
// that — the same shape as OxyHQ/Mention's `components/BottomBar.tsx`.
const webFixedStyle = IS_WEB
  ? asViewStyle({ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1000 })
  : undefined;

export function BottomNav({ screen }: { screen: ScreenId }) {
  const { colors } = useTheme();
  const { progress, selectTab } = useTabPager();
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

  return <View testID="bottom-navigation" style={webFixedStyle}>
    {/* `activeProgress` is the swipe's own position, written by the pager
        every frame on the UI thread, so the highlight travels with the finger
        instead of jumping once the page lands. `selectTab` is the one path a
        tap and a swipe both take. */}
    <TabBar activeIndex={activeIndex} activeProgress={progress} onIndexChange={selectTab} theme={tabBarTheme}>
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
