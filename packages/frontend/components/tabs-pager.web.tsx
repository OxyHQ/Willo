/**
 * Web never renders a pager: `app/(tabs)/_layout.tsx` returns a plain `<Slot/>`
 * there, because pages sitting side by side cannot coexist with the
 * document-scroll model the web shell is built on.
 *
 * This file exists so the web bundle never IMPORTS one either. An import is
 * static — the layout's platform branch happens far too late to stop it — and
 * `react-native-pager-view` reaches for `codegenNativeCommands`, which drags
 * React Native's own renderer and `InitializeCore` into a browser bundle. That
 * ends as `__fbBatchedBridgeConfig is not set` on the first paint: a white
 * page. Metro resolves `.web.tsx` first, so on web the pager is this instead.
 */
export function TabsPager(): null {
  return null;
}
