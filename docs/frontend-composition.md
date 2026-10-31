# Frontend composition

`app/_layout.tsx` places the persistent product header, navigation and routed
content in Bloom's `AppShell`. The shell chooses between the 80-pixel rail and
bottom navigation at `BREAKPOINTS.rail` (640 logical pixels). Its panel descriptor
owns the surface, frame and eight-pixel desktop right/bottom inset. Domain card
packing and the 1440-pixel content limit remain in Willo's layout helpers.

`ScreenChrome` keeps the composer and timeline providers above both the persistent
header and routed content. Native retained pages and their pager progress remain
mounted; that same progress drives the existing TabBar selection animation.
The separate photo-frame app does not use this shell.

The workspace header uses `panelLayout.headerPlacement="scroll-under"`: web keeps
the header in document flow, while native paints the surface and scroll viewport
under it and reserves its measured height in scroll content. SafeAreaView owns
the root's left/right edges and the header's top edge. Bloom's TabBar owns its
bottom safe area and floating material; AppShell measures its bottom-bar slot.
Willo does not measure header/bar height or copy their clearance into routes.
`panelLayout.headerSpan="frame"` gives the workspace header the full frame
width while the panel keeps its eight-pixel end inset. Header actions therefore
retain their established alignment without a consumer margin adjustment.

Each `ScreenSurface` renders a route `Screen`, with its active state derived from
the route. `PageScroll` renders `ScreenScrollView` and owns restoration for that
route. `DocumentScrollRestorationBoundary` disables the workspace's automatic
document owner, so it cannot compete with those route owners. The Expo Router
adapter is installed once on `BloomProvider`.

Screens use `scroll="content"` so route footers, including the assistant composer,
stay outside their scrolling body. The explicit `documentScroll` prop makes web
use the document while native retains the ScreenScrollView. Auth/setup policy,
Home Assistant actions and the legacy entity controls remain route concerns.

## Shared dependency

This archive preserves the experimental adoption on consumer base `2cc3a54`.
The browser and typecheck trial used Bloom commit `ee7e4628e4331de42acf5140fbae78f5381f0d33`
(packaged locally as 15.81.0). That package was not published. This archive is
not a deployable dependency update: the manifest deliberately retains published
15.70.0, which cannot typecheck the complete experimental API. The active worktree
returns to the clean published-package base after archiving.

This adoption requires Bloom's workspace `scroll-under` header contract, TabBar
participation in the AppShell bottom slot, the workspace header's `frame` span,
and DocumentScrollRestorationBoundary.
They must be present in the resolved package before this patch can be integrated;
the existing published 15.70.0 dependency does not provide the complete contract.
Local source/package mirrors are verification tools, never a deployable dependency.

## Verification

Run `bun test ./tests/*.test.ts` and
`bun run --cwd packages/frontend typecheck`. Start Expo web with the public
environment values documented in the app's environment example. Check 390, 639,
640, 1024 and 1440 pixels with the real Metro/NativeWind pipeline. A preview with
missing utility CSS is not a usable visual baseline.

Compare the existing signed-out and demo screens, the compact bottom bar, and a
long page scrolled beneath the persistent header. Verify independent route scroll
positions (for example Home 80, Settings 25), resetting a first arrival and
restoring each previous position on return. Disable only the route restoration
owner as a negative control: the same scenario must fail.

The OxyOS `WorkspaceChromeProbe` measures the shared header and bottom slot with
Hermes/Fabric/Yoga and real compositor wheel input. That CPU offscreen probe does
not establish iOS/Android device safe areas, native pager gestures or keyboard
avoidance; verify those separately on the supported device builds.
