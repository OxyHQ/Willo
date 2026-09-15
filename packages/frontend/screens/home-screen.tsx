import React, { useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, View } from 'react-native';
import { CameraCard, RealCameraCard } from '../components/camera-card';
import { DemoLightTile } from './devices-screen';
import { Icon, type IconName } from '@willo/ui';
import { Label, Tile, useOptimisticValue } from '@willo/ui';
import { ThermostatCard } from '../components/thermostat-card';
import { SensorReadingsCard } from '../components/sensor-readings-card';
import { DashboardGrid, type DashboardCard } from '../layout/dashboard-grid';
import { PageScroll } from '../layout/page-layout';
import { useResponsiveLayout } from '../layout/responsive-context';
import type { ScreenProps } from '../data/screens';
import { useHome } from '../state/home-context';
import type { DeviceKey } from '../state/home-reducer';
import { getCapability, type Device } from '../providers/types';
import { SENSOR_CARD_LIMIT, selectRelevantSensors } from '../providers/sensor-readings';
import { DEMO_SENSORS } from '../data/demo-sensors';
import { useTheme } from '@oxy.so/bloom/theme';

type Category = 'Favorites' | 'All' | 'Cameras' | 'Lights' | 'Wifi' | 'Climate';
const categories: { name: Category; icon: IconName }[] = [
  { name: 'Favorites', icon: 'heart' }, { name: 'All', icon: 'grid' }, { name: 'Cameras', icon: 'camera' },
  { name: 'Lights', icon: 'light' }, { name: 'Wifi', icon: 'wifi' }, { name: 'Climate', icon: 'climate' },
];
type HomeCard = DashboardCard & { category: Category };

/**
 * A real light's `subtitle`/`tone`/`active` are all derived from the SAME
 * `percent` that drives the fill — dragging moves all three together instead
 * of the fill alone updating while the "On · X%" text sits frozen on the
 * pre-drag value. Its own component (not a plain helper called in a
 * `.map`/inline, like `lightTile` used to be): `useOptimisticValue` is a
 * hook, and the real light list here is exactly the dynamic-length loop that
 * breaks the rules of hooks when a hook is called from a plain function
 * instead of a component.
 */
function LightTile({ light }: { light: Device }) {
  const { setSheet, sendCommand } = useHome();
  const onOff = getCapability(light, 'onOff');
  const brightnessCapability = getCapability(light, 'brightness');
  // Not every light HA reports is dimmable — a plain on/off light has no
  // `brightness` capability at all, and gets no slider (`brightness`/
  // `onBrightnessChange` both left `undefined`) rather than one that always
  // reads 100%.
  const dimmable = brightnessCapability !== undefined;
  const [percent, setPercent] = useOptimisticValue(dimmable ? (onOff?.on ? brightnessCapability.percent ?? 100 : 0) : 0);
  const on = dimmable ? percent > 0 : (onOff?.on ?? false);
  return <Tile grow={false} height={80} title={light.name}
    subtitle={on ? (dimmable ? `On · ${percent}%` : 'On') : 'Off'}
    icon="light" tone={on ? 'yellow' : 'neutral'} active={on}
    brightness={dimmable ? percent : undefined}
    onBrightnessChange={dimmable ? next => { setPercent(next); sendCommand(light.id, next === 0 ? { kind: 'setOnOff', on: false } : { kind: 'setBrightness', percent: next }); } : undefined}
    onPress={() => sendCommand(light.id, { kind: 'setOnOff', on: !onOff?.on })}
    onLongPress={() => setSheet({ kind: 'realDevice', title: light.name, device: light })}/>;
}
/** Same reasoning as `LightTile` above — a real component, not a plain
 * function called during render, so `useOptimisticValue` (a hook) obeys
 * the rules of hooks instead of sitting behind a conditional early return. */
function FanTile({ fan }: { fan: Device }) {
  const { setSheet, sendCommand } = useHome();
  const onOff = getCapability(fan, 'onOff');
  const speedCapability = getCapability(fan, 'fanSpeed');
  // Not every fan HA reports supports a variable speed — a plain on/off fan
  // has no `fanSpeed` capability at all, and gets no slider, matching
  // `LightTile`'s own `dimmable` reasoning exactly.
  const adjustable = speedCapability !== undefined;
  const [percent, setPercent] = useOptimisticValue(adjustable ? (onOff?.on ? speedCapability.percent ?? 100 : 0) : 0);
  const on = adjustable ? percent > 0 : (onOff?.on ?? false);
  return <Tile grow={false} height={80} title={fan.name}
    subtitle={on ? (adjustable ? `On · ${percent}%` : 'On') : 'Off'}
    icon="fan" tone={on ? 'blue' : 'neutral'} active={on}
    brightness={adjustable ? percent : undefined}
    onBrightnessChange={adjustable ? next => { setPercent(next); sendCommand(fan.id, next === 0 ? { kind: 'setOnOff', on: false } : { kind: 'setFanSpeed', percent: next }); } : undefined}
    onPress={() => sendCommand(fan.id, { kind: 'setOnOff', on: !onOff?.on })}
    onLongPress={() => setSheet({ kind: 'realDevice', title: fan.name, device: fan })}/>;
}
export function HomeScreen({ onNavigate, header }: ScreenProps) {
  const { state, dispatch, setSheet, devices, sendCommand, demoMode } = useHome();
  const { colors: themeColors } = useTheme();
  const { compact, columns, gutter } = useResponsiveLayout();
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
  const [labelWidths, setLabelWidths] = useState<Partial<Record<Category, number>>>({});
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
  const message = (title: string, description: string) => setSheet({ kind: 'message', title, description });
  // Demo mode never mixes with real devices — see `useHome()`'s own doc
  // comment on `demoMode`. Forcing these to empty here (rather than at the
  // `base` entries below) means every derived list — `extraLightCards`,
  // `extraCameraCards`, the "no lights/cameras found" fallbacks — stays
  // correct for free instead of needing its own demoMode check.
  const lights = demoMode ? [] : devices.filter(d => d.domain === 'light');
  const cameras = demoMode ? [] : devices.filter(d => d.domain === 'camera');
  const fan = demoMode ? undefined : devices.find(d => d.domain === 'fan');
  const sensors = demoMode ? DEMO_SENSORS : devices.filter(d => d.domain === 'sensor');
  const noLights = <Tile grow={false} height={80} title="No lights found" subtitle="Check Home Assistant" icon="light" tone="neutral" onPress={() => onNavigate('settings')}/>;
  const cameraTile = (camera: Device, cameraHeight: number) => <RealCameraCard key={camera.id} camera={camera} height={cameraHeight}/>;
  const noCameras = <Tile grow={false} height={80} title="No cameras found" subtitle="Check Home Assistant" icon="camera-off" tone="neutral" onPress={() => onNavigate('settings')}/>;
  const device = (id: DeviceKey, title: string, icon: IconName) => <Tile grow={false} height={80} title={title}
    subtitle={id === 'garage' ? (state.devices[id] ? 'Open' : 'Closed') : state.devices[id] ? (id === 'speaker' ? `Playing · ${state.brightness[id] ?? 50}%` : 'On') : 'Off'}
    icon={icon} tone={state.devices[id] ? 'blue' : id === 'garage' ? 'blue' : 'neutral'}
    active={state.devices[id]}
    onPress={() => dispatch({ type: 'TOGGLE_DEVICE', id })}/>;
  const lock = <Tile grow={false} title="Front door lock" subtitle={state.locked ? 'Locked' : 'Unlocked'}
    icon={state.locked ? 'lock' : 'unlock'} tone={state.locked ? 'blue' : 'neutral'} active={state.locked}
    onPress={() => dispatch({ type: 'TOGGLE_LOCK' })}/>;
  const weather = <Tile grow={false} title="San Francisco" subtitle="56° · Clear" icon="sun" height={72}
    onPress={() => message('Weather preview', 'The weather and location are static values from the supplied reference.')}/>;
  const air = <Tile grow={false} title="Outdoor AQI" subtitle="32 · Good" icon="waves" height={72}
    onPress={() => message('Air quality preview', 'AQI 32 is a static reference value, not a live reading.')}/>;
  const noFan = <Tile grow={false} height={80} title="No fan found" subtitle="Check Home Assistant" icon="fan" tone="neutral" onPress={() => onNavigate('settings')}/>;
  const relevantSensors = selectRelevantSensors(sensors);
  const cardSensors = relevantSensors.slice(0, SENSOR_CARD_LIMIT);
  const hiddenSensorCount = relevantSensors.length - cardSensors.length;
  // 16px padding top and bottom plus a ~24px header, then ~28px (16px text
  // + 12px gap) per row: the empty state and the "+N more" row count as rows.
  const sensorRowCount = Math.max(cardSensors.length, 1) + (hiddenSensorCount > 0 ? 1 : 0);
  const sensorList = <SensorReadingsCard title="Indoor readings" sensors={cardSensors} hiddenCount={hiddenSensorCount} onShowMore={() => onNavigate('devices')}/>;
  const base = {
    camera: { id: 'camera', category: 'Cameras', span: full, lane: 0, estimatedHeight: compact ? 188 : 170, content: demoMode ? <CameraCard label="Living room" height={compact ? 188 : 170}/> : (cameras[0] ? cameraTile(cameras[0], compact ? 188 : 170) : noCameras) },
    lock: { id: 'lock', category: 'All', lane: 0, estimatedHeight: 80, content: lock },
    light: { id: 'light', category: 'Lights', lane: 1, estimatedHeight: 80, content: demoMode ? <DemoLightTile id="living-lamp" title="Lamp"/> : (lights[0] ? <LightTile light={lights[0]}/> : noLights) },
    thermostat: { id: 'thermostat', category: 'Climate', span: full, lane: 2, estimatedHeight: compact ? 228 : 238, content: <ThermostatCard/> },
    weather: { id: 'weather', category: 'Climate', lane: 3, estimatedHeight: 72, content: weather },
    air: { id: 'air', category: 'Climate', lane: 3, estimatedHeight: 72, content: air },
    fan: { id: 'fan', category: 'Climate', lane: 3, estimatedHeight: 80, content: demoMode ? device('fan', 'Fan', 'fan') : (fan ? <FanTile fan={fan}/> : noFan) },
    tv: { id: 'tv', category: 'All', lane: 1, estimatedHeight: 80, content: device('tv', 'TV', 'tv') },
    garage: { id: 'garage', category: 'All', lane: 0, estimatedHeight: 80, content: device('garage', 'Garage', 'garage') },
    speaker: { id: 'speaker', category: 'All', lane: 1, estimatedHeight: 80, content: device('speaker', 'Speaker', 'speaker') },
    garden: { id: 'garden', category: 'Cameras', lane: 2, estimatedHeight: 240, content: demoMode ? <CameraCard garden height={240}/> : (cameras[1] ? cameraTile(cameras[1], 240) : noCameras) },
    plug: { id: 'plug', category: 'All', lane: 1, estimatedHeight: 80, content: device('plug', 'Plug', 'plug') },
    sensors: { id: 'sensors', category: 'Climate', lane: 3, estimatedHeight: 56 + 28 * sensorRowCount, content: sensorList },
    floor: { id: 'floor', category: 'Lights', lane: 1, estimatedHeight: 80, content: demoMode ? <DemoLightTile id="office-lamp" title="Lamp"/> : (lights[1] ? <LightTile light={lights[1]}/> : noLights) },
    wifi: { id: 'wifi', category: 'Wifi', estimatedHeight: 80, content: <Tile grow={false} title="Office WiFi" subtitle="Settings preview" icon="wifi" tone="green" onPress={() => onNavigate('settings')}/> },
  } satisfies Record<string, HomeCard>;
  // Demo-only tiles (no real Home Assistant equivalent — see `useHome()`'s
  // `demoMode` doc comment) only ever appear WITH the rest of the demo
  // catalog.
  const DEMO_ONLY_CARDS: (keyof typeof base)[] = ['tv', 'garage', 'speaker', 'plug', 'lock'];
  const hiddenCards = new Set<keyof typeof base>(demoMode ? [] : DEMO_ONLY_CARDS);
  const orderBase: (keyof typeof base)[] = compact
    ? ['camera', 'lock', 'light', 'thermostat', 'weather', 'air']
    : ['camera', 'light', 'thermostat', 'fan', 'lock', 'tv', 'air', 'garage', 'speaker', 'garden', 'weather', 'plug', 'sensors', 'floor'];
  const order = orderBase.filter(id => !hiddenCards.has(id));
  // Beyond the favorite slots above, the full Lights/Cameras tabs list every
  // real light or camera Home Assistant reports, not just a fixed pair.
  const extraLightCards: HomeCard[] = lights.slice(2).map((light, index) => ({
    id: `light-${light.id}`, category: 'Lights', lane: index % 4, estimatedHeight: 80, content: <LightTile key={light.id} light={light}/>,
  }));
  const extraCameraCards: HomeCard[] = cameras.slice(2).map((camera, index) => ({
    id: `camera-${camera.id}`, category: 'Cameras', lane: index % 2, estimatedHeight: 170, content: cameraTile(camera, 170),
  }));
  const visible: HomeCard[] = selected === 'Favorites' ? order.map(id => base[id])
    : selected === 'All' ? [...order, ...(Object.keys(base) as (keyof typeof base)[]).filter(id => !order.includes(id) && !hiddenCards.has(id))].map(id => ({ ...base[id], lane: undefined }))
    : selected === 'Lights' ? [...Object.values(base).filter(card => card.category === 'Lights'), ...extraLightCards].map(card => ({ ...card, lane: undefined }))
    : selected === 'Cameras' ? [...Object.values(base).filter(card => card.category === 'Cameras'), ...extraCameraCards].map(card => ({ ...card, lane: undefined, span: compact ? 2 : 1 }))
    : Object.values(base).filter(card => card.category === selected && !hiddenCards.has(card.id as keyof typeof base)).map(card => ({ ...card, lane: undefined }));
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
            return <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={category.name} accessibilityState={{ selected: active }}
              onPress={() => selectCategory(category.name)}
              className={`h-[50px] flex-row items-center justify-center gap-2 rounded-[18px] px-4 active:opacity-70 ${active ? 'bg-primary-subtle' : 'bg-muted'}`}>
              <Icon name={category.icon} filled={active && category.icon === 'heart'} size={18} color={active ? themeColors.primary : themeColors.textSecondary}/>
              <Label className={labelClassName}>{category.name}</Label>
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
          const naturalWidth = labelWidths[category.name] ?? 54;
          return <Pressable key={category.name} accessibilityRole="button" accessibilityLabel={category.name} accessibilityState={{ selected: active }}
            onPress={() => selectCategory(category.name)} className="active:opacity-70">
            <Animated.View className={`h-[50px] flex-row items-center rounded-full px-4 ${active ? 'bg-primary-subtle' : 'bg-muted'}`}>
              <Icon name={category.icon} filled={active && category.icon === 'heart'} size={21} color={active ? themeColors.primary : themeColors.textSecondary}/>
              <Animated.View style={{
                overflow: 'hidden',
                width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, naturalWidth] }),
                marginLeft: widthAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }),
              }}>
                <Label numberOfLines={1} className={labelClassName}>{category.name}</Label>
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
          One `onLayout` per name, ever — the text never changes, so nothing
          re-measures after the first paint. */}
      {compact && categories.map(category => labelWidths[category.name] === undefined && (
        <Label key={`measure-${category.name}`} numberOfLines={1}
          onLayout={event => setLabelWidths(widths => ({ ...widths, [category.name]: event.nativeEvent.layout.width }))}
          className="text-[14px] font-medium" style={{ position: 'absolute', opacity: 0 }} pointerEvents="none">
          {category.name}
        </Label>
      ))}
      <Animated.View style={{ opacity: gridOpacity }}>
        <DashboardGrid cards={visible} columns={selected === 'Cameras' && !compact ? Math.min(columns, 2) : columns}/>
      </Animated.View>
    </PageScroll>
  </View>;
}
