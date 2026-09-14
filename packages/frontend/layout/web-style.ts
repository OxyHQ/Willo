import type { ViewStyle } from 'react-native';

/**
 * RN's `ViewStyle` type is shared with native, so it rejects real web-only CSS
 * values (`position: 'sticky'`, a `calc()` string, `'100vh'`) even though
 * react-native-web passes them straight through unchanged. This function is
 * the one place that bridges a real web style object into that stricter type
 * for a `.tsx` file that IS web-only — the same reasoning as OxyHQ/Mention's
 * `types/webStyles.ts`.
 */
export function asViewStyle(style: Record<string, unknown>): ViewStyle {
  return style as unknown as ViewStyle;
}
