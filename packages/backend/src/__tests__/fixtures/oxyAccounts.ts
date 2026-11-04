import type { OxyAccountLookup } from '../../services/homeMembers.service';

/** Oxy's answer when every id asked about names an account. */
export const EVERY_ACCOUNT_EXISTS: OxyAccountLookup = {
  lookupMany: async () => ({ missing: [], failed: [] }),
};
