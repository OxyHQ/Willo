export const colors = {
  ink: '#202124', muted: '#5f6368', surface: '#f1f4f9', nav: '#f0f5ff',
  blue: '#d9e1ff', onBlue: '#064aba', sky: '#c1e8fc', onSky: '#00537f',
  yellow: '#fff0c8', yellowFill: '#ffe182', onYellow: '#625007',
  peach: '#ffddd1', peachButton: '#ffb799', onPeach: '#8e3205',
  green: '#e1f5df', onGreen: '#146524', red: '#b3261e',
} as const;
// Complete, static class strings: NativeWind's compiler can discover every variant.
export const tones = {
  blue: { tile: 'bg-home-blue', text: 'text-home-on-blue', color: colors.onBlue },
  sky: { tile: 'bg-home-sky', text: 'text-home-on-sky', color: colors.onSky },
  yellow: { tile: 'bg-home-yellow', text: 'text-home-on-yellow', color: colors.onYellow },
  peach: { tile: 'bg-home-peach', text: 'text-home-on-peach', color: colors.onPeach },
  green: { tile: 'bg-home-green', text: 'text-home-on-green', color: colors.onGreen },
  neutral: { tile: 'bg-home-surface', text: 'text-home-ink', color: colors.ink },
} as const;
export type Tone = keyof typeof tones;
