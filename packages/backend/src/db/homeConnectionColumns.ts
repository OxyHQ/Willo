/**
 * The one place that names which `home_connections` columns are safe to
 * return from a general "does this Home have a connection, and where does it
 * point" read.
 *
 * Mirrors OxyHQ/oxy's "protected columns" idea at a scale appropriate to a
 * single sensitive column instead of building its generic registry: rather
 * than a mechanism that scans every table for a marked column, this is one
 * named constant that leaves `refreshToken` out.
 *
 * `homeConnection.service.ts`'s `getConnectionForDisplay` is the only caller.
 * `brokerAccessToken` (same file) is the ONLY function anywhere in this
 * codebase allowed to select `refreshToken` itself — see its comment.
 */

import type { SelectedRow } from '@oxy.so/db';
import { homeConnections } from './schema';

export const HOME_CONNECTION_DISPLAY_COLUMNS = {
  id: homeConnections.id,
  homeId: homeConnections.homeId,
  provider: homeConnections.provider,
  instanceUrl: homeConnections.instanceUrl,
  clientId: homeConnections.clientId,
  createdAt: homeConnections.createdAt,
  updatedAt: homeConnections.updatedAt,
} as const;

export type HomeConnectionDisplayRow = SelectedRow<typeof HOME_CONNECTION_DISPLAY_COLUMNS>;
