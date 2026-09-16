import React, { useMemo, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { RealCameraCard } from '../components/camera-card';
import { Icon, type IconName } from '@willo.sh/ui';
import { Label, Tile } from '@willo.sh/ui';
import { ThermostatCard } from '../components/thermostat-card';
import { SensorReadingsCard, estimateSensorCardHeight } from '../components/sensor-readings-card';
import { DeviceTile } from '../components/device-tile';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { PageScroll } from '../layout/page-layout';
import { cameraRows, cardHeight, cardRowsFor } from '../layout/card-sizes';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import { type Device } from '../providers/types';
import { SENSOR_CARD_LIMIT, selectRelevantSensors } from '../providers/sensor-readings';
import { formatTemperature } from '../providers/unit-system';
import { useTheme } from '@oxy.so/bloom/theme';
import { useTranslation } from 'react-i18next';
import type { ParseKeys } from 'i18next';

type Category = 'Favorites' | 'All' | 'Cameras' | 'Lights' | 'Wifi' | 'Climate';
/** `name` is what selection compares — never the (translated) `labelKey` beside it. */
const categories: { name: Category; labelKey: ParseKeys; icon: IconName }[] = [
  { name: 'Favorites', labelKey: 'home.categories.favorites', icon: 'heart' },
  { name: 'All', labelKey: 'home.categories.all', icon: 'grid' },
  { name: 'Cameras', labelKey: 'home.categories.cameras', icon: 'camera' },
  { name: 'Lights', labelKey: 'home.categories.lights', icon: 'light' },
  { name: 'Wifi', labelKey: 'home.categories.wifi', icon: 'wifi' },
  { name: 'Climate', labelKey: 'home.categories.climate', icon: 'climate' },
];
type HomeCard = DashboardCard & { category: Category };
/** A camera shows a picture, so it gets a picture-shaped card rather than a tile; a doorbell is a camera with a button. */
const CAMERA_DOMAINS = new Set(['camera', 'doorbell']);
/** Readings belong in the indoor-readings card, never in a tile of their own. */
const READING_DOMAINS = new Set(['sensor', 'binary_sensor']);
/** Anything that heats, cools or moves air answers to the Climate tab. */
const CLIMATE_DOMAINS = new Set(['fan', 'purifier', 'humidifier', 'heater', 'air-conditioner']);
const categoryForDomain = (domain: string): Category =>
  domain === 'light' ? 'Lights' : CAMERA_DOMAINS.has(domain) ? 'Cameras' : CLIMATE_DOMAINS.has(domain) ? 'Climate' : 'All';
/** The controls Favorites shows one of, in the order they appear there. */
const FAVOURITE_DOMAINS = ['light', 'lock', 'cover', 'vacuum', 'media_player'];

export function HomeScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, setSheet, devices, sendCommand, demoMode, unitSystem } = useHome();
  const { colors: themeColors } = useTheme();
  const { t, i18n } = useTranslation();
  const { compact, columns, gutter, gap } = useResponsiveLayout();
  const [selected, setSelected] = useState<Category>('Favorites');
  // Crossfades the grid on category change instead of snapping straight to
  // the new set of cards — an instant swap reads as "nothing happened" (the
  // grid just silently becomes different cards) rather than as a selection
  // that visibly took effect.
  const gridOpacity = useRef(new Animated.Value(1)).current;
  // One width value per chip (0 = collapsed to icon-only, 1 = its label at
  // full width) instead of a single "which one is open" flag, so the
  // OUTGOING chip's collapse and the INCOMING chip's expand run as two ends
  // of the SAME `Animated.parallel` rather than two separately-timed
  // transitions — that's what makes them read as one motion instead of a
  // collapse, a pause, then a separate expand.
  const chipWidths = useRef<Record<Category, Animated.Value>>(
    Object.fromEntries(categories.map(c => [c.name, new Animated.Value(c.name === 'Favorites' ? 1 : 0)])) as Record<Category, Animated.Value>,
  ).current;
  // A collapsed chip's label can't be measured directly — it's rendered at
  // zero size. Each label's REAL natural width comes from an invisible,
  // always-full-size copy of it (below, `opacity: 0`, `position: absolute`,
  // out of the touch/layout flow) measured once via `onLayout`; the visible,
  // animated copy then collapses/expands toward that real number instead of
  // a guessed fixed budget, which read as too wide for shorter names ("All")
  // and would've clipped a longer one that didn't fit.
  // Keyed `language:category`: the same chip's label is a different width in each language.
  const [labelWidths, setLabelWidths] = useState<Partial<Record<`${string}:${Category}`, number>>>({});
  function selectCategory(next: Category) {
    if (next === selected) return;
    // `useNativeDriver` is left off throughout: it must animate on NATIVE
    // too (not just web), and react-native-web's support for it is
    // inconsistent enough that when it silently doesn't engage, the
    // animation's callback never fires — which would leave `selected` stuck
    // on whatever it already was, i.e. exactly "tapping another chip does
    // nothing." Plain JS-driven `Animated.timing` always fires, everywhere.
    // `{ finished }` guards the callback: tapping a second chip before the
    // fade-out finishes STOPS this animation (interrupted, not finished) and
    // starts a new one, so the interrupted one must not also commit its OWN
    // now-stale `next` — only the animation that actually completes should.
    Animated.timing(gridOpacity, { toValue: 0, duration: 120, useNativeDriver: false }).start(({ finished }) => {
      if (!finished) return;
      setSelected(next);
      Animated.timing(gridOpacity, { toValue: 1, duration: 160, useNativeDriver: false }).start();
      Animated.parallel(
        categories.map(c => Animated.timing(chipWidths[c.name], { toValue: c.name === next ? 1 : 0, duration: 220, useNativeDriver: false })),
      ).start();
    });
  }
  const full = compact ? 2 : 1;
  // Every card is a whole number of tile rows tall, so a tall one ends level
  // with the stack of tiles beside it — see `layout/card-sizes.ts`.
  const tile = cardHeight(1, gap);
  const twoRows = cardHeight(2, gap);
  const cameraSpan = compact ? 2 : 1;
  const cameraCardHeight = cardHeight(cameraRows(cameraSpan), gap);
  const message = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  // Demo mode is a provider now (`providers/demo-home.ts`), so there is no
  // demo branch here: both catalogs arrive as the same `devices` list.
  // Memoised because the tunnel pushes a new array on every Home Assistant
  // state change, several a second in a real house.
  const { lights, cameras, thermostat, controls, relevantSensors } = useMemo(() => ({
    lights: devices.filter(device => device.domain === 'light'),
    cameras: devices.filter(device => CAMERA_DOMAINS.has(device.domain)),
    thermostat: devices.find(device => device.domain === 'climate'),
    // Everything a tile can operate: not a camera, not a reading, and not the
    // thermostat, which has a card of its own below.
    controls: devices.filter(device => !CAMERA_DOMAINS.has(device.domain) && !READING_DOMAINS.has(device.domain) && device.domain !== 'climate'),
    relevantSensors: selectRelevantSensors(devices),
  }), [devices]);
  const cardSensors = relevantSensors.slice(0, SENSOR_CARD_LIMIT);
  const hiddenSensorCount = relevantSensors.length - cardSensors.length;
  // The empty state and the "+N more" row each take a row's worth of space.
  const sensorRowCount = Math.max(cardSensors.length, 1) + (hiddenSensorCount > 0 ? 1 : 0);
  const sensorCardHeight = cardHeight(cardRowsFor(estimateSensorCardHeight(sensorRowCount), gap), gap);

  const staticCards = {
    sensors: { id: 'sensors', category: 'Climate', estimatedHeight: sensorCardHeight,
      content: <SensorReadingsCard title={t('home.indoorReadings')} sensors={cardSensors} hiddenCount={hiddenSensorCount} height={sensorCardHeight} onShowMore={() => onNavigate('devices')}/> },
    weather: { id: 'weather', category: 'Climate', estimatedHeight: tile,
      content: <Tile grow={false} title={t('home.weatherCity')} subtitle={t('home.weatherSubtitle', { temperature: formatTemperature(56, '°F', unitSystem) })} icon="sun" height={tile}
        onPress={() => message(t('home.weatherTitle'), t('home.weatherDescription'))}/> },
    air: { id: 'air', category: 'Climate', estimatedHeight: tile,
      content: <Tile grow={false} title={t('home.airTitle')} subtitle={t('home.airSubtitle')} icon="waves" height={tile}
        onPress={() => message(t('home.airPreviewTitle'), t('home.airDescription'))}/> },
    wifi: { id: 'wifi', category: 'Wifi', estimatedHeight: tile,
      content: <Tile grow={false} title={t('settings.officeWifi')} subtitle={t('home.settingsPreview')} icon="wifi" tone="green" height={tile} onPress={() => onNavigate('settings')}/> },
  } satisfies Record<string, HomeCard>;
  const thermostatCard: HomeCard | null = thermostat
    ? { id: thermostat.id, category: 'Climate', span: full, estimatedHeight: twoRows, content: <ThermostatCard device={thermostat} height={twoRows}/> }
    : null;
  const cameraCards: HomeCard[] = cameras.map(camera => ({
    id: camera.id, category: 'Cameras', span: cameraSpan, estimatedHeight: cameraCardHeight,
    content: <RealCameraCard camera={camera} height={cameraCardHeight}/>,
  }));
  const controlCards: HomeCard[] = controls.map(device => ({
    id: device.id, category: categoryForDomain(device.domain), estimatedHeight: tile,
    content: <DeviceTile device={device} height={tile} grow={false}/>,
  }));
  const emptyCard = (titleKey: ParseKeys, icon: IconName): HomeCard => ({
    id: `empty-${icon}`, category: selected, estimatedHeight: tile,
    content: <Tile grow={false} height={tile} title={t(titleKey)} subtitle={t('home.checkHomeAssistant')} icon={icon} tone="neutral" onPress={() => onNavigate('settings')}/>,
  });

  // Favorites is a curated front page, not the whole house: the two cameras,
  // the thermostat, the readings and one of each control a person reaches for
  // most. The lane numbers keep the desktop's four columns in the shape the
  // reference lays out — a camera and the lock down the left, lights and
  // media in the middle, weather and readings on the right — instead of
  // letting the masonry drop them wherever they fit.
  const nth = (domain: string, index: number) => controls.filter(device => device.domain === domain)[index];
  const lane = (card: HomeCard | undefined, laneIndex: number): HomeCard[] => card ? [{ ...card, lane: laneIndex }] : [];
  const cardFor = (device: Device | undefined) => device && controlCards.find(card => card.id === device.id);
  const favourites: HomeCard[] = compact
    ? [
      ...lane(cameraCards[0], 0),
      ...lane(cardFor(nth('light', 0)), 0),
      ...(thermostatCard ? [thermostatCard] : []),
      staticCards.sensors,
      ...lane(cardFor(nth('lock', 0)), 0),
      staticCards.weather, staticCards.air,
    ]
    : [
      ...lane(cameraCards[0], 0),
      ...lane(cardFor(nth('light', 0)), 1),
      ...lane(thermostatCard ?? undefined, 2),
      ...lane(staticCards.weather, 3),
      ...lane(cardFor(nth('lock', 0)), 0),
      ...lane(cardFor(nth('tv', 0)), 1),
      ...lane(staticCards.air, 3),
      ...lane(cardFor(nth('cover', 0)), 0),
      ...lane(cardFor(nth('media_player', 0)), 1),
      ...lane(cameraCards[1], 2),
      ...lane(staticCards.sensors, 3),
      ...lane(cardFor(nth('vacuum', 0)), 0),
      ...lane(cardFor(nth('light', 1)), 1),
      ...lane(cardFor(nth('fan', 0)), 3),
    ];
  const allCards: HomeCard[] = [...cameraCards, ...(thermostatCard ? [thermostatCard] : []), ...controlCards, ...Object.values(staticCards)];
  const inCategory = (category: Category) => allCards.filter(card => card.category === category);
  const visible: HomeCard[] = selected === 'Favorites' ? favourites
    : selected === 'All' ? allCards
    : selected === 'Cameras' ? (cameraCards.length ? cameraCards : [emptyCard('home.noCameras', 'camera-off')])
    : selected === 'Lights' ? (lights.length ? inCategory('Lights') : [emptyCard('home.noLights', 'light')])
    : inCategory(selected);
  return <View className="min-h-0 flex-1 bg-card">
    <PageScroll>
      {header}
      {/* Cancels PageScroll's own horizontal padding (a real horizontal
          scroller must reach the true edges, not stop at the resting
          container's padding) and puts the same inset back on the scrollable
          content's start/end instead, so it still rests inset but can pan
          past it. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -gutter }} contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: gutter, gap: 8 }}>
        {categories.map(category => {
          const active = selected === category.name;
          const labelClassName = `text-[14px] ${active ? 'font-medium text-primary-text' : 'text-muted-foreground'}`;
          // Desktop always shows every label — nothing to animate, so it
          // stays the plain, un-animated render it always was.
          if (!compact) {
            return <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={t(category.labelKey)} accessibilityState={{ selected: active }}
              onPress={() => selectCategory(category.name)}
              className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[18px] px-4 active:opacity-70 ${active ? 'bg-primary-subtle' : 'bg-muted'}`}>
              <Icon name={category.icon} filled={active && category.icon === 'heart'} size={18} color={active ? themeColors.primary : themeColors.textSecondary}/>
              <Label className={labelClassName}>{t(category.labelKey)}</Label>
            </Pressable>;
          }
          // Compact: only the SELECTED chip shows its label — the rest
          // collapse to an icon-only circle. The label's WIDTH (0 to its own
          // measured natural width) and its leading MARGIN (0 to 8, replacing
          // a static `gap`) are both driven by this one chip's own share of
          // the same `Animated.parallel` in `selectCategory`, so the chip
          // losing its label and the one gaining one move together, not one
          // after the other. Falls back to a small placeholder before the
          // real width is measured (first paint only).
          const widthAnim = chipWidths[category.name];
          const naturalWidth = labelWidths[`${i18n.language}:${category.name}`] ?? 54;
          return <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={t(category.labelKey)} accessibilityState={{ selected: active }}
            onPress={() => selectCategory(category.name)} className="active:opacity-70">
            <Animated.View className={`h-[50px] flex-row items-center rounded-full px-4 ${active ? 'bg-primary-subtle' : 'bg-muted'}`}>
              <Icon name={category.icon} filled={active && category.icon === 'heart'} size={21} color={active ? themeColors.primary : themeColors.textSecondary}/>
              <Animated.View style={{
                overflow: 'hidden',
                width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, naturalWidth] }),
                marginLeft: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
              }}>
                <Label numberOfLines={1} className={labelClassName}>{t(category.labelKey)}</Label>
              </Animated.View>
            </Animated.View>
          </Pressable>;
        })}
      </ScrollView>
      {/* Invisible measurers: a collapsed chip's label is rendered at zero
          size, so its real natural width can only come from a separate,
          always-full-size copy — `opacity: 0` (invisible but still laid out
          and measurable, unlike `display: none`), `position: absolute` (out
          of this row's own flow, so it doesn't add width or a gap of its
          own), and no pointer events (not a second, invisible tap target
          sitting over the real chips). `font-medium`: the label is only ever
          actually shown while ACTIVE (`labelClassName` above), which is also
          the only time it's rendered at `font-medium` — a heavier weight
          measures WIDER than the regular one this used to measure with, so
          it was undercounting the one width that's ever really on screen.
          One `onLayout` per name per language — a label only changes when the
          UI language does, and then its new width is measured once too. */}
      {compact && categories.map(category => labelWidths[`${i18n.language}:${category.name}`] === undefined && (
        <Label key={`measure-${i18n.language}-${category.name}`} numberOfLines={1}
          onLayout={event => setLabelWidths(widths => ({ ...widths, [`${i18n.language}:${category.name}`]: event.nativeEvent.layout.width }))}
          className="text-[14px] font-medium" style={{ position: 'absolute', opacity: 0 }} pointerEvents="none">
          {t(category.labelKey)}
        </Label>
      ))}
      <Animated.View style={{ opacity: gridOpacity }}>
        <DashboardGrid cards={visible} columns={selected === 'Cameras' && !compact ? Math.min(columns, 2) : columns}/>
      </Animated.View>
    </PageScroll>
  </View>;
}
