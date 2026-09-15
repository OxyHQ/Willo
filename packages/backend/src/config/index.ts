/**
 * Environment configuration, validated once at import time (zod, matching
 * this repo's validation convention — see the route body schemas in
 * `routes/homes.routes.ts`). Every value that varies between environments
 * comes from here; nothing downstream reads `process.env` directly.
 */

import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4200),
  // REQUIRED. No default: a missing DATABASE_URL must fail startup loudly
  // rather than silently pick a database nobody chose.
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // requireOxyAuth/getRequiredOxyUserId (@oxy.so/core/server) validate every
  // bearer token by calling this API directly — no local signing secret.
  OXY_API_URL: z.string().url().default('https://api.oxy.so'),
  // Comma-separated browser origins allowed to call this API with
  // credentials, in addition to the built-in *.oxy.so family createOxyCors
  // always allows.
  CORS_ORIGINS: z.string().optional(),
  // Encrypts `device_claims.pending_secret` at rest (AES-256-GCM) — the one
  // column in this database that ever holds a tunnel secret in plaintext,
  // for the brief window between an owner completing a device claim and the
  // device's own next poll collecting it. Optional at the schema level (so
  // importing `config` never breaks an environment/test that doesn't touch
  // this feature) but required in practice the moment that code path runs —
  // see `services/homeTunnel.service.ts`'s `getClaimEncryptionKey`, the
  // only place this is read. 64 hex characters = 32 raw bytes.
  TUNNEL_CLAIM_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, 'TUNNEL_CLAIM_ENCRYPTION_KEY must be 64 hex characters (32 bytes)').optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

const env = parsed.data;

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  databaseUrl: env.DATABASE_URL,
  oxyApiUrl: env.OXY_API_URL,
  corsOrigins: env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [],
  tunnelClaimEncryptionKey: env.TUNNEL_CLAIM_ENCRYPTION_KEY,
};
