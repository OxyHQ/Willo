import { useState } from 'react';

/**
 * Tracks a LOCAL override of `committed` that a caller can set eagerly (e.g.
 * every frame of a drag) without waiting for `committed` itself to catch up
 * — a real round trip to an external device, which may be slow or, in a
 * disconnected/demo session, may never resolve at all. The override wins
 * over `committed` until `committed` is next seen to actually change: that
 * real confirmation is what lets go of the override, not a fixed event like
 * a drag ending — clearing it there would snap the displayed value back to
 * whatever stale `committed` still held, then snap forward again once (if)
 * the real value ever arrives.
 *
 * A plain comparison during render (React's own documented pattern for
 * "adjusting state when a prop changes"), not a `useEffect`: an Effect here
 * would cost an extra render every time `committed` changes for no reason.
 */
export function useOptimisticValue<T>(committed: T): [T, (next: T) => void] {
  const [override, setOverride] = useState<T | null>(null);
  const [lastSeenCommitted, setLastSeenCommitted] = useState(committed);
  if (committed !== lastSeenCommitted) {
    setLastSeenCommitted(committed);
    setOverride(null);
  }
  return [override ?? committed, setOverride];
}
