/**
 * The one place that names which `home_connections` columns are safe to
 * return from a general "does this Home have a tunnel, and is it connected"
 * read.
 *
 * Mirrors OxyHQ/oxy's "protected columns" idea at a scale appropriate to a
 * single sensitive column instead of building its generic registry: rather
 * than a mechanism that scans every table for a marked column, this is one
 * named constant that leaves `tunnelSecretHash` out. `pairingCode` is left
 * out too — it is a live, single-use bearer credential for whoever finishes
 * pairing, not something a "does this Home have a connection" read should
 * ever hand back out; it is returned exactly once, by
 * `homeTunnel.service.ts`'s `issuePairingCode` itself.
 *
 * `homeTunnel.service.ts`'s `getLiveDevices` is the only caller.
 * `authenticateTunnel` (same file) is the ONLY function anywhere in this
 * codebase allowed to select `tunnelSecretHash` itself — see its comment.
 */

import type { SelectedRow } from '@oxy.so/db';
import { homeConnections } from './schema';

export const HOME_CONNECTION_DISPLAY_COLUMNS = {
  id: homeConnections.id,
  homeId: homeConnections.homeId,
  provider: homeConnections.provider,
  connectedAt: homeConnections.connectedAt,
  lastSeenAt: homeConnections.lastSeenAt,
  deviceSnapshot: homeConnections.deviceSnapshot,
  createdAt: homeConnections.createdAt,
  updatedAt: homeConnections.updatedAt,
} as const;

export type HomeConnectionDisplayRow = SelectedRow<typeof HOME_CONNECTION_DISPLAY_COLUMNS>;
