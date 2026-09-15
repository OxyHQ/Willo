import React from 'react';
import { Rail, type RailItem } from '@oxy.so/bloom/rail';
import { useTheme } from '@oxy.so/bloom/theme';
import { Icon } from '@willo/ui';
import type { Navigate, ScreenId } from '../data/screens';
import { useResponsiveLayout } from '../layout/responsive-context';
import { isNavigationActive, tabs } from './navigation-items';

const ICON_SIZE = 22;

// The sticky, full-height desktop-sidebar positioning this used to hand-roll
// (`position: sticky` against document scroll on web, a plain flow sibling on
// native) now lives in Bloom's `Rail` — see `@oxy.so/bloom` docs/rail.mdx.
// This file is left owning only what is actually Willo's: which tabs exist,
// which one is active for the current screen, and how each looks.
export function NavigationRail({ screen, onNavigate }: { screen: ScreenId; onNavigate: Navigate }) {
  const { navigationWidth } = useResponsiveLayout();
  const { colors } = useTheme();

  const activeTab = tabs.find(tab => isNavigationActive(screen, tab.screen));

  // `icon`/`activeIcon`: the same two-node convention Bloom's `TabBarItem`
  // uses (see `bottom-nav.tsx`) — Willo pre-colors both states itself since
  // `Icon` takes `color`/`filled` directly rather than a `fill` Bloom could
  // tint on its behalf.
  const items: RailItem[] = tabs.map(tab => ({
    id: tab.screen,
    label: tab.title,
    icon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.textSecondary}/>,
    activeIcon: <Icon name={tab.icon} size={ICON_SIZE} color={colors.primary} filled/>,
  }));

  // `onSelect` reports a plain `id`; looked up against `tabs` rather than cast
  // back to `ScreenId`, since every id Rail can report originates from this
  // same list.
  const handleSelect = (id: string) => {
    const tab = tabs.find(t => t.screen === id);
    if (tab) onNavigate(tab.screen);
  };

  return <Rail testID="navigation-rail" items={items} activeId={activeTab?.screen} onSelect={handleSelect} width={navigationWidth}/>;
}
