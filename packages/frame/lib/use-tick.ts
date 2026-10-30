import { useCallback, useSyncExternalStore } from 'react';

/**
 * A number that goes up by one every `intervalMs`, on the wall clock's
 * boundaries (`intervalMs = 60_000` changes as each minute starts), so every
 * part of the frame that turns over on time — the clock, the alert panel,
 * the news — turns at the same instant and none drifts. Read through
 * `useSyncExternalStore`: the clock is the external system, and a component
 * re-renders only when its own count changes.
 */
export function useTick(intervalMs: number): number {
  const subscribe = useCallback(
    (notify: () => void) => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const schedule = () => {
        // A few milliseconds past the boundary, so the count has changed when it fires.
        timer = setTimeout(
          () => {
            notify();
            schedule();
          },
          intervalMs - (Date.now() % intervalMs) + 20,
        );
      };
      schedule();
      return () => clearTimeout(timer);
    },
    [intervalMs],
  );
  return useSyncExternalStore(subscribe, () => Math.floor(Date.now() / intervalMs));
}
