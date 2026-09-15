import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { parseRgb, useTheme } from '@oxy.so/bloom/theme';
import { type ThemedAnimation } from '../data/lottie-animations';
import { recolorLottie, type LottieRgb } from './lottie-recolor';

interface ThemedLottieProps {
  animation: ThemedAnimation;
  /** Sets the width; the height follows the animation's own aspect ratio. */
  className?: string;
  shouldLoop?: boolean;
}

/**
 * A Lottie animation recoloured with the active Bloom theme.
 *
 * Memoised because `LottieView` serialises its whole `source` to JSON on every
 * render, native and web alike: without it, a parent re-rendering on each
 * keystroke would re-serialise the animation each time.
 */
export const ThemedLottie = memo(function ThemedLottie({ animation, className, shouldLoop = true }: ThemedLottieProps) {
  const { colors } = useTheme();

  const source = useMemo(() => {
    const palette = new Map<string, LottieRgb>();
    for (const [sourceHex, role] of Object.entries(animation.colorRoles)) {
      const rgb = parseRgb(colors[role]);
      if (!rgb) {
        console.warn(`ThemedLottie: could not parse Bloom colour "${role}" (${colors[role]}); keeping ${sourceHex}.`);
        continue;
      }
      palette.set(sourceHex, [rgb.r / 255, rgb.g / 255, rgb.b / 255]);
    }
    return recolorLottie(animation.source, palette);
  }, [animation, colors]);

  return (
    <View className={className} style={{ aspectRatio: animation.source.w / animation.source.h }}>
      <LottieView
        source={source}
        autoPlay
        loop={shouldLoop}
        style={{ width: '100%', height: '100%' }}
        webStyle={{ width: '100%', height: '100%' }}
      />
    </View>
  );
});
