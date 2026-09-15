import type { ThemeColors } from '@oxy.so/bloom/theme';
import type { AnimationObject } from 'lottie-react-native';
import { cropLottie } from '../components/lottie-crop';
import connectHomeAssistant from '../assets/animations/connect-home-assistant.json';
import createHome from '../assets/animations/create-home.json';

export interface ThemedAnimation {
  source: AnimationObject;
  /**
   * Each colour the animation was exported with (lowercase `#rrggbb`) and the
   * Bloom role that replaces it, so the animation follows the active theme.
   */
  colorRoles: Readonly<Record<string, keyof ThemeColors>>;
}

export const LOTTIE_ANIMATIONS = {
  // Blocks that rise into a grey house with blue stairs and a yellow figure.
  // Both exports draw in the middle of a 360×360 canvas and hide pieces behind
  // a white block below y=279 until they rise; the crop keeps only the drawing,
  // so that block (the one white fill) is never on screen and needs no role.
  createHome: {
    source: cropLottie(createHome, { x: 58, y: 92, width: 276, height: 187 }),
    colorRoles: {
      '#f8f9fa': 'backgroundSecondary',
      '#dfe1e5': 'border',
      '#bdc1c6': 'textTertiary',
      '#4285f4': 'primary',
      '#fabb05': 'secondary',
    },
  },
  // The same neutral greys and accents as `createHome`, plus a green success
  // and a red error state for the connection it illustrates.
  connectHomeAssistant: {
    source: cropLottie(connectHomeAssistant, { x: 58, y: 36, width: 276, height: 243 }),
    colorRoles: {
      '#f8f9fa': 'backgroundSecondary',
      '#dfe1e5': 'border',
      '#bdc1c6': 'textTertiary',
      '#bec1c6': 'textTertiary',
      '#9aa0a6': 'textSecondary',
      '#4285f4': 'primary',
      '#fabb05': 'secondary',
      '#34a853': 'success',
      '#fa4335': 'error',
    },
  },
} satisfies Record<string, ThemedAnimation>;
