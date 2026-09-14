import { eq } from 'drizzle-orm';
import { getDb } from '../db/postgres';
import { homeDeviceMetadata } from '../db/schema';
import { emitToHome } from '../realtime/socketRegistry';
import { assertActiveMember } from './homes.service';

export type HomeDeviceMetadataRow = typeof homeDeviceMetadata.$inferSelect;

/** This Home's device-metadata overlay. Any active member. */
export async function listDeviceMetadata(homeId: string, userId: string): Promise<HomeDeviceMetadataRow[]> {
  await assertActiveMember(homeId, userId);
  return getDb().select().from(homeDeviceMetadata).where(eq(homeDeviceMetadata.homeId, homeId));
}

export interface DeviceMetadataInput {
  customName?: string | null;
  room?: string | null;
  isFavorite?: boolean;
}

/**
 * Upsert the metadata overlay for one HA entity. Any active member — a
 * household member renaming "Light 3" to "Kitchen ceiling" doesn't need to be
 * the owner. A full replace on every field (PUT semantics): an omitted field
 * resets to its default rather than being left untouched, so the request
 * body is always the complete desired state for that entity.
 */
export async function upsertDeviceMetadata(
  homeId: string,
  userId: string,
  entityId: string,
  input: DeviceMetadataInput
): Promise<HomeDeviceMetadataRow> {
  await assertActiveMember(homeId, userId);

  const values = {
    customName: input.customName ?? null,
    room: input.room ?? null,
    isFavorite: input.isFavorite ?? false,
  };

  const [row] = await getDb()
    .insert(homeDeviceMetadata)
    .values({ homeId, entityId, ...values })
    .onConflictDoUpdate({
      target: [homeDeviceMetadata.homeId, homeDeviceMetadata.entityId],
      set: values,
    })
    .returning();
  if (!row) throw new Error('Failed to upsert device metadata.');

  emitToHome(homeId, 'home:device-updated', row);
  return row;
}
