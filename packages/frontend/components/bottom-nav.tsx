import { Platform, View } from 'react-native';
import { TabBar, TabBarButton, type TabBarItem, type TabBarTheme } from '@oxy.so/bloom/tab-bar';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ScreenId } from '../data/screens';
import { Icon } from '@willo.sh/ui';
import { tabs, isNavigationActive } from './navigation-items';
import { useTabPager } from '../state/tab-pager';

const IS_WEB = Platform.OS === 'web';
const ICON_SIZE = 21;

export function BottomNav({ screen }: { screen: ScreenId }) {
  const { colors } = useTheme();
  const { progress, selectTab } = useTabPager();
  const { t } = useTranslation();
  const activeIndex = tabs.findIndex((tab) => isNavigationActive(screen, tab.screen));
  // Sourced from Bloom's own theme instead of Willo's static `home-sky`/
  // `onSky`/`muted` tokens — `highlight` pairs with `activeTint` the same way
  // `primarySubtle`/`primary` do everywhere else in this migration (a tinted
  // "selected" surface + the accent legible on it).
  const tabBarTheme: Partial<TabBarTheme> = {
    activeTint: colors.primary,
    inactiveTint: colors.textSecondary,
    highlight: colors.primarySubtle,
  };

  return (
    <View testID="bottom-navigation">
      {/* `activeProgress` is the swipe's own position, written by the pager
        every frame on the UI thread, so the highlight travels with the finger
        instead of jumping once the page lands. Bloom stops moving the capsule
        from `activeIndex` once it is given, so WEB — which has no pager to
        write it — must not pass it, or the highlight would stay put on every
        navigation that didn't come from the bar. `selectTab` is the one path a
        tap and a swipe both take. */}
      <TabBar
        activeIndex={activeIndex}
        activeProgress={IS_WEB ? undefined : progress}
        onIndexChange={selectTab}
        theme={tabBarTheme}
      >
        {tabs.map((tab, index) => {
          const item: TabBarItem = {
            name: tab.screen,
            label: t(tab.titleKey),
            icon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.textSecondary} />,
            activeIcon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.primary} filled />,
          };
          return <TabBarButton key={tab.screen} item={item} index={index} />;
        })}
      </TabBar>
    </View>
  );
}
