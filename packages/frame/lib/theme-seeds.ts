import { useSyncExternalStore } from 'react';

/**
 * The seed colours of the photo on screen. The whole frame's theme follows
 * the photo, but the theme provider sits above the screen that knows which
 * photo is showing: the screen sets them here as each photo appears, the root
 * layout reads them for `BloomProvider`. The array only changes identity when
 * the seeds do, so a reader re-renders only for a new colour.
 */
let seeds: readonly string[] = [];
const listeners = new Set<() => void>();

export function setThemeSeeds(next: readonly string[]): void {
  if (next.join() === seeds.join()) return;
  seeds = next;
  for (const listener of listeners) listener();
}

export function useThemeSeeds(): readonly string[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => seeds,
  );
}
