ALTER TABLE "home_connections" ALTER COLUMN "instance_url" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "home_connections" ALTER COLUMN "client_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "home_connections" ALTER COLUMN "refresh_token" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "pairing_code" text;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "pairing_code_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "tunnel_secret_hash" text;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "connected_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "last_seen_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "home_connections" ADD COLUMN "device_snapshot" jsonb;