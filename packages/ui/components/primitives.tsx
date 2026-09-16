import React, { useMemo, useRef, useState } from 'react';
import { Image, type ImageSource } from 'expo-image';
import { Platform, Pressable, Text, View, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { Icon, type IconName } from './icon';
import { colors, tones, type Tone } from '../theme/tokens';
import { useTheme } from '@oxy.so/bloom/theme';
import * as Haptics from 'expo-haptics';
const IS_WEB = Platform.OS === 'web';
/** How often a drag is allowed to reach the real device. ~16 commands a second is smoother than the eye and a fraction of a 120 Hz drag's frames. */
const COMMIT_INTERVAL_MS = 60;
/**
 * The touch has to land within this much of an edge to mean 0 or 100. Mapping
 * the raw X straight onto 0-100 put full brightness on the tile's very last
 * pixel, so a drag that visually ran to the end still reported 98 or 99 and
 * the fill never closed.
 */
const EDGE_SNAP_PX = 16;
/** A tick every ten percent while dragging — enough to feel the slider move, not enough to buzz. */
const HAPTIC_STEP_PERCENT = 10;
/**
 * A tile is a physical control, so it answers like one: a tick when it toggles
 * and one every ten percent under a drag.
 *
 * `expo-haptics` straight, not through Bloom's `useHaptics`, which loads it as
 * an OPTIONAL peer and swallows both a failed load and a rejected
 * `impactAsync` — so a haptic that never fires is indistinguishable from a
 * device with them turned off. Here a real failure is logged once. No-ops on
 * web, which has no haptics API.
 */
let hasWarnedAboutHaptics = false;
function buzz(style: Haptics.ImpactFeedbackStyle) {
  if (IS_WEB) return;
  Haptics.impactAsync(style).catch((error: unknown) => {
    if (hasWarnedAboutHaptics) return;
    hasWarnedAboutHaptics = true;
    console.error('Haptics are unavailable on this device:', error);
  });
}
const tap = () => buzz(Haptics.ImpactFeedbackStyle.Light);
const hold = () => buzz(Haptics.ImpactFeedbackStyle.Medium);
/**
 * Web has a real mouse cursor to hide while dragging a slider (matching a
 * native OS slider's own feel); native has no cursor at all, so this is a
 * no-op there. Toggled directly on `document.body` rather than the tile
 * itself — the pointer can drag past the tile's own edges mid-gesture, and
 * the cursor should stay hidden for the whole gesture, not just while over it.
 */
function setBodyCursorHidden(hidden: boolean) {
  if (IS_WEB && typeof document !== 'undefined') document.body.style.cursor = hidden ? 'none' : '';
}
/**
 * Every piece of text in the app goes through here, so this is the one place
 * to make text unselectable by default — no per-screen opt-out to remember.
 * `userSelect` (a real `TextStyle` property since RN 0.71, not a NativeWind
 * class — NativeWind's own `select-none` utility is web-only) works
 * identically on native and web. The one place that DOES want selection
 * (the assistant's answer text, `assistant-screen.tsx`) already passes RN's
 * own `selectable` prop; when it does, this flips `userSelect` to `'text'`
 * instead of overriding it.
 */
export function Label({ className = '', style, selectable, ...props }: TextProps & { className?: string }) {
  return <Text {...props} selectable={selectable} style={[{ userSelect: selectable ? 'text' : 'none' }, style]} className={`font-sans text-foreground ${className}`} />;
}
export function IconButton({ icon, onPress, label, color, className = '', size = 22, disabled = false, shape = 'regular' }: { icon: IconName; onPress: () => void; label: string; color?: string; className?: string; size?: number; disabled?: boolean; shape?: 'regular' | 'small' | 'stepper' }) {
  const dimensions = { regular: 'h-11 w-11', small: 'h-9 w-9', stepper: 'h-[58px] w-[66px]' }[shape];
  // `color` falls back to the theme's own text color (not a static default
  // parameter) so an unset one still follows the active theme/mode.
  const { colors: themeColors } = useTheme();
  // Every icon button is a real control — the thermostat's steppers most of
  // all, where a held finger repeats the press — so each one answers with the
  // same tick a tile does.
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={() => { tap(); onPress(); }} hitSlop={4} className={`${dimensions} items-center justify-center rounded-full active:opacity-60 ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${className}`}><Icon name={icon} size={size} color={color ?? themeColors.text}/></Pressable>;
}
export function Avatar({ onPress, source, label }: { onPress: () => void; source: ImageSource; label: string }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-9 w-9 cursor-pointer overflow-hidden rounded-full bg-muted active:opacity-70"><Image source={source} style={{ width: '100%', height: '100%' }} contentFit="cover"/></Pressable>;
}
export function SectionTitle({ children, right, onPress }: { children: React.ReactNode; right?: string; onPress?: () => void }) {
  return <View className="mb-3 mt-5 flex-row items-center justify-between"><Label className="text-[13px] font-medium">{children}</Label>{right && <Pressable onPress={onPress} accessibilityRole="button" className="cursor-pointer p-1"><Label className="text-[12px] font-medium text-info-text">{right}</Label></Pressable>}</View>;
}
/**
 * A tile's icon and its two lines of text. Rendered twice per tile: once
 * normally, and once more in the on-fill contrast color, clipped to the
 * brightness fill's own width. One component rather than two copies, so the
 * clipped copy can't drift out of alignment with the one underneath it.
 */
function TileFace({ icon, title, subtitle, color, labelClassName = '', labelStyle, filledIcon }: { icon: IconName; title: string; subtitle?: string; color: string; labelClassName?: string; labelStyle?: TextStyle; filledIcon: boolean }) {
  return <>
    <View className="relative"><Icon name={icon} size={20} color={color} filled={filledIcon}/></View>
    <View className="min-w-0 flex-1 py-2">
      <Label className={`text-[13px] font-medium leading-[17px] ${labelClassName}`} style={labelStyle}>{title}</Label>
      {subtitle && <Label className={`mt-0.5 text-[11px] leading-[14px] ${labelClassName}`} style={labelStyle}>{subtitle}</Label>}
    </View>
  </>;
}
/**
 * The brightness fill's solid color, by tone — `bg-{tone}` pairs with each
 * tone's own `bg-{tone}-subtle` (`tones.ts`) the same way `ThermostatCard`'s
 * solid `bg-tertiary` buttons pair with its `bg-tertiary-subtle` card. Falls
 * back to `bg-secondary`: `neutral` (an off device) has no real solid
 * counterpart, and brightness on an off device doesn't occur in practice.
 */
const TONE_FILL_CLASS: Partial<Record<Tone, string>> = { sky: 'bg-primary', blue: 'bg-info', yellow: 'bg-secondary', peach: 'bg-tertiary', green: 'bg-success' };
export function Tile({ title, subtitle, icon, tone = 'neutral', onPress, onLongPress, brightness, onBrightnessCommit, chevron = false, active, height = 80, grow = true, accessibilityHint }: { title: string; subtitle?: string; icon: IconName; tone?: Tone; onPress: () => void; onLongPress?: () => void; /** Already translated by the caller — this package has no strings of its own. Describe the drag when there's a slider, or the long press when there's one. */ accessibilityHint?: string; /** Where the fill rests when no finger is on the tile. While one is, the drag drives it on the UI thread instead. */ brightness?: number; /** The drag's value, rate-limited to `COMMIT_INTERVAL_MS` and sent once more when the finger lifts. Passing it is what turns the tile into a slider. */ onBrightnessCommit?: (percent: number) => void; chevron?: boolean; active?: boolean; height?: number; grow?: boolean }) {
  const palette = tones[tone];
  const { colors: themeColors, isDark } = useTheme();
  // Tones migrated to Bloom's own theme so far (`tokens.ts`) need the SAME
  // live value their `bg-*-subtle`/`text-*-text` classes already track via
  // CSS, since `palette.color` is a plain inline prop (no CSS variable
  // involved) and would otherwise stay the static brand hex regardless of
  // mode. The rest of `tones` still uses `palette.color` as-is until they
  // migrate the same way.
  const migratedToneColor: Partial<Record<Tone, string>> = { sky: themeColors.primary, blue: themeColors.info, yellow: themeColors.secondary, peach: themeColors.tertiary, green: themeColors.success, neutral: themeColors.textSecondary };
  const iconColor = migratedToneColor[tone] ?? palette.color;
  // The brightness fill's solid color, by tone — `bg-{tone}` pairs with
  // each tone's own `bg-{tone}-subtle` (`tones.ts`) the same way
  // `ThermostatCard`'s solid `bg-tertiary` buttons pair with its
  // `bg-tertiary-subtle` card. Falls back to `bg-secondary`: `neutral` (an
  // off device) has no real solid counterpart and brightness on an off
  // device isn't a case that actually occurs in practice.
  const [pressed, setPressed] = useState(false);
  // The tile's own measured width: the pan turns a touch's X into a 0-100
  // percent with it, and the fill's clipped text overlay below is pinned to
  // it. State, not a ref — the overlay reads it while rendering, and a ref
  // read during render shows whatever the last unrelated re-render happened
  // to catch. It settles on the first layout and only moves when the tile
  // itself is resized.
  const [width, setWidth] = useState(0);
  /**
   * Where the drag has the fill, in percent, ON THE UI THREAD — and -1 while
   * no finger is down, which is when the fill follows the `brightness` prop
   * instead.
   *
   * The pan used to run its callbacks on the JS thread and set React state on
   * every frame. At 120 Hz that is a render per frame competing with whatever
   * the screen was already doing, which is exactly how a slider ends up
   * lagging behind the finger it is supposed to be following. Now the fill is
   * animated from a worklet and React hears about the drag only at
   * `COMMIT_INTERVAL_MS`.
   */
  const dragPercent = useSharedValue(-1);
  /** The last percent the drag settled on, so a frame that lands on the same one does nothing at all. */
  const lastReported = useSharedValue(-1);
  /** When the last commit went out, so the device hears about a drag at a sane rate. */
  const lastCommitAt = useSharedValue(0);
  /** Which ten-percent step last buzzed, so the tick fires on crossing one rather than on every frame. */
  const lastHapticStep = useSharedValue(-1);
  // NOT a `Pressable`: a `Pressable`'s own touch responder claims a touch
  // before any sibling gesture recognizer — `Gesture.Native()` and (on a
  // second attempt) core `PanResponder`, both wrapped around a `Pressable`,
  // never received a single move event, on either web or native. This is
  // RNGH's own documented behavior, not something specific to this file.
  //
  // NOT a separate `Gesture.Tap()` either (a third attempt): raced against
  // `panGesture`/`longPressGesture`, its own activation never reliably won
  // that race here. Rather than keep guessing at RNGH's web arbitration,
  // `onPress` is instead derived from `panGesture`'s OWN outcome — no
  // separate recognizer to race against it at all. A `Pan` gesture that
  // never reaches `minDistance` still fires `onEnd` with `success: false`
  // (every gesture type does — that boolean is exactly what distinguishes
  // "ended, but never activated" from "ended, activated"); that's a tap,
  // UNLESS the long-press already fired for this same touch (`longPressFired`
  // below), since a long, still hold ALSO never reaches `minDistance`.
  // Built once per set of handlers, not per render: RNGH ships every new
  // gesture object to native with `updateGestureHandler`, so a screen of fifty
  // tiles re-rendering meant hundreds of native reconfigurations a second.
  // That only pays off because `DeviceTile` hands down stable callbacks — a
  // caller passing fresh arrows would defeat this memo.
  //
  // `runOnJS(true)` on both gestures below: RNGH runs a gesture's callbacks as
  // worklets on the UI thread unless told otherwise, and every callback here
  // is ordinary React — `setPressed`, `onPress`, a ref read. On web there is
  // no separate runtime so it worked by accident; on Android each touch threw
  // `[Worklets] Tried to synchronously call a Remote Function. Called "bound
  // dispatchSetState" on the UI Runtime`. None of this work belongs on the UI
  // thread anyway: it all ends in a React state update.
  /** A shared value, not a ref: the pan reads it from a worklet and the long press writes it from JS. */
  const longPressFired = useSharedValue(false);
  const composedGesture = useMemo(() => {
    const longPressGesture = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(500)
      .onTouchesDown(() => setPressed(true))
      .onFinalize(() => setPressed(false))
      .onStart(() => { longPressFired.value = true; hold(); onLongPress?.(); });
    // Dragging anywhere on the tile jumps the fill straight to that point (an
    // absolute position, not a relative delta from where the drag started) —
    // that's what makes the tile itself read as a brightness slider.
    // `minDistance(10)`: a real mouse (unlike a touchscreen finger) rarely
    // stays at the EXACT same pixel between down and up even for an intended
    // click — a couple of px of natural jitter is normal; 10px is the standard
    // click-vs-drag threshold and comfortably clears it. Left ENABLED even
    // when `onBrightnessChange` is unset (a plain toggle-only tile) — this
    // gesture is also this tile's only path to a tap now, not just its drag.
    const panGesture = Gesture.Pan()
      .minDistance(10)
      // The slider only ever moves sideways, so it claims a touch only once
      // the finger has committed to that axis and gives up the moment the
      // finger goes vertical. Without this the tile and the screen's scroll
      // both wanted every drag: scrolling past a list of tiles fought the tile
      // under the thumb, which is what made the screen feel sticky and the
      // sliders feel like they were lagging behind the finger.
      .activeOffsetX([-10, 10])
      .failOffsetY([-8, 8])
      .onTouchesDown(() => { longPressFired.value = false; runOnJS(setPressed)(true); })
      .onStart(() => runOnJS(setBodyCursorHidden)(true))
      // Two different rates, because the two callbacks pay for very different
      // things. The fill and the subtitle follow every step of the finger, but
      // only once the whole-number percent has actually moved — a 120 Hz drag
      // lands on the same percent several frames running. The COMMIT is what
      // reaches the device (an HTTP call per light, or in demo mode a write
      // every open tab picks up), so it goes out at most every
      // `COMMIT_INTERVAL_MS`; `onFinalize` then sends the value the finger
      // ended on, so the device never settles on a stale one.
      .onUpdate(event => {
        if (width <= 0) return;
        const travel = Math.max(1, width - EDGE_SNAP_PX * 2);
        const percent = Math.round(Math.min(100, Math.max(0, ((event.x - EDGE_SNAP_PX) / travel) * 100)));
        if (percent === lastReported.value) return;
        lastReported.value = percent;
        // The fill is this assignment and nothing else — no render, no bridge.
        dragPercent.value = percent;
        const step = Math.round(percent / HAPTIC_STEP_PERCENT);
        if (step !== lastHapticStep.value) {
          lastHapticStep.value = step;
          runOnJS(tap)();
        }
        // The commit is what reaches the device — an HTTP call per light, or
        // in demo mode a write every open tab picks up — so it is the one
        // thing rate-limited, and `onFinalize` sends the value the finger
        // ended on so the device never settles on a stale one.
        const now = Date.now();
        if (now - lastCommitAt.value < COMMIT_INTERVAL_MS) return;
        lastCommitAt.value = now;
        if (onBrightnessCommit) runOnJS(onBrightnessCommit)(percent);
      })
      // `onEnd`, not `onFinalize` alone, was the actual bug: RNGH's own event
      // dispatch (`eventReceiver.js`) only calls `onEnd` when the gesture's
      // OLD state was `ACTIVE` — a tap never reaches `minDistance`, so it goes
      // straight from `BEGAN` to `FAILED` and `onEnd` never fires AT ALL for
      // it, regardless of the `success` flag its type signature advertises.
      // `onFinalize` is the one callback RNGH always calls at the end of every
      // gesture attempt, activated or not — that's the one this needs.
      .onFinalize((_event, success) => {
        runOnJS(setPressed)(false);
        runOnJS(setBodyCursorHidden)(false);
        if (lastReported.value >= 0 && onBrightnessCommit) runOnJS(onBrightnessCommit)(lastReported.value);
        lastReported.value = -1;
        lastCommitAt.value = 0;
        lastHapticStep.value = -1;
        dragPercent.value = -1;
        if (!success && !longPressFired.value) {
          runOnJS(tap)();
          runOnJS(onPress)();
        }
      });
      return Gesture.Race(panGesture, longPressGesture);
  }, [width, onPress, onLongPress, onBrightnessCommit, dragPercent, lastReported, lastCommitAt, lastHapticStep, longPressFired]);
  // Web-only (NativeWind no-ops `cursor-*` on native, where the concept
  // doesn't exist): a plain `View` + `GestureDetector`, unlike the
  // `Pressable` this used to be, gets none of the browser's own hover-cursor
  // affordances for free. Draggable tiles hint `grab`/`grabbing` (open hand,
  // closed while actually dragging) instead of the plain `pointer` every tile
  // still gets for its tap — same distinction a real OS slider makes.
  const cursorClassName = onBrightnessCommit ? (pressed ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer';
  const restingBrightness = brightness !== undefined ? Math.min(100, Math.max(0, brightness)) : 0;
  // The fill's width, straight from the shared value while a finger is down
  // and from the prop the rest of the time. Both the fill and the clipped
  // overlay read this one style, so they can never disagree.
  const fillStyle = useAnimatedStyle(
    () => ({ width: `${dragPercent.value >= 0 ? dragPercent.value : restingBrightness}%` }),
    [restingBrightness],
  );
  // Bloom's own real per-tone "legible on solid fill" tokens — the M3-engine
  // answer for text/icon color sitting directly on top of each tone's solid
  // `bg-{tone}` fill above, straight from `useTheme()`, no local computation.
  // `yellow` keeps ONE deliberate exception in dark mode: `colors.onYellow`
  // (a warm olive) over Bloom's own `secondaryForeground`, for brand-identity
  // reasons, not because Bloom's answer is wrong — both are legible there, this
  // is a style preference. `neutral` has no fill/on-fill case in practice (an
  // off device), so it is left with no on-fill treatment, same as today.
  const onFillColor: Partial<Record<Tone, string>> = {
    sky: themeColors.primaryForeground,
    yellow: isDark ? colors.onYellow : themeColors.secondaryForeground,
    peach: themeColors.tertiaryForeground,
    blue: themeColors.infoForeground,
    green: themeColors.successForeground,
  };
  const fillTextColor = onFillColor[tone];
  const filledIcon = active === true && (icon === 'light' || icon === 'lock');
  return <GestureDetector gesture={composedGesture}>
    <View collapsable={false} onLayout={event => setWidth(event.nativeEvent.layout.width)} accessibilityRole={active === undefined ? 'button' : 'switch'} accessibilityState={active === undefined ? undefined : { checked: active }} accessibilityLabel={`${title}${subtitle ? ', ' + subtitle : ''}`} accessibilityHint={accessibilityHint} className={`relative min-w-0 ${grow ? 'flex-1' : ''} justify-center overflow-hidden rounded-[24px] ${cursorClassName} ${pressed ? 'opacity-75' : ''} ${palette.tile}`} style={{ minHeight: height, borderCurve: 'continuous' }}>
      {/* The tone's own solid color, not its `-subtle` tint: a real
          progress indicator, matching `ThermostatCard`'s solid `tertiary`
          buttons rather than the tinted `-subtle` surfaces. */}
      {brightness !== undefined && <Animated.View pointerEvents="none" className={`absolute bottom-0 left-0 top-0 ${TONE_FILL_CLASS[tone] ?? 'bg-secondary'}`} style={fillStyle}/>}
      {/* The tile's horizontal padding lives HERE, not on the root. A
          percentage width on an absolutely positioned child resolves against
          its parent's CONTENT box, so with `px-4` on the root a 100% fill
          came up 32px short — visibly so, and it dragged the clipped overlay
          out of line with the text underneath it by the same amount. */}
      <View className="min-w-0 flex-row items-center gap-3 px-4">
        <TileFace icon={icon} title={title} subtitle={subtitle} color={iconColor} labelClassName={palette.text} filledIcon={filledIcon}/>
        {chevron && <Icon name="chevron" size={16} color={iconColor}/>}
      </View>
      {/* The same `TileFace` again — in the on-fill contrast color —
          clipped to EXACTLY the fill's own width via an OUTER
          `overflow: hidden` window (`width: X%`, a plain CSS percentage
          against the tile's own width, no JS measuring needed for that
          part). `bottom-0 left-0 top-0` (three edges, no `right`) matches
          the fill View above EXACTLY — setting all four edges via `inset-0`
          together with an explicit `width` is an over-constrained box that
          rendered wrong the first time this was tried.
          The INNER content is pinned to the tile's own real measured
          width (`width`, already tracked above for the drag
          gesture) rather than being left to size itself off the narrow
          OUTER window — that was the second bug: giving the icon+label
          row the clipped width as ITS OWN flex container made it actually
          reflow/wrap into that narrow space at low brightness instead of
          staying full-size and simply being cropped by the window around
          it. Only basic `position`/`width`/`overflow` are used — no blend
          mode, no gradient-clip-text, both of which turned out not to
          reliably work through this app's actual styling pipeline. */}
      {brightness !== undefined && width > 0 && fillTextColor !== undefined && (
        <Animated.View pointerEvents="none" className="absolute bottom-0 left-0 top-0 overflow-hidden" style={fillStyle}>
          <View className="flex-row items-center gap-3 px-4" style={{ width, height: '100%' }}>
            <TileFace icon={icon} title={title} subtitle={subtitle} color={fillTextColor} labelStyle={{ color: fillTextColor }} filledIcon={filledIcon}/>
          </View>
        </Animated.View>
      )}
    </View>
  </GestureDetector>;
}
export function AddButton({ onPress, label, accessibilityLabel }: { onPress: () => void; label: string; accessibilityLabel: string }) {
  const { colors: themeColors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} className="absolute bottom-5 right-4 flex-row items-center gap-2 cursor-pointer rounded-[15px] bg-info-subtle px-4 py-3 active:opacity-70" style={{ boxShadow: '0 2px 5px rgba(29,52,91,0.14)' }}><Icon name="plus" size={20} color={themeColors.info}/><Label className="text-[13px] font-medium text-info-text">{label}</Label></Pressable>;
}
export function Pill({ label, onPress, selected = false }: { label: string; onPress: () => void; selected?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} className={`flex-row items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 active:opacity-70 ${selected ? 'border-primary-subtle bg-primary-subtle' : 'border-border bg-white'}`}><Label className="text-[12px]">{label}</Label><Icon name="down" size={12}/></Pressable>;
}
