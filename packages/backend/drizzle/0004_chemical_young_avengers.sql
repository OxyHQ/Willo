CREATE TABLE "device_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"claim_code" text NOT NULL,
	"claim_token_hash" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"home_id" text,
	"pending_secret" text,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "device_claims_claim_code_key" UNIQUE("claim_code"),
	CONSTRAINT "device_claims_status_check" CHECK ("device_claims"."status" in ('pending', 'claimed', 'expired'))
);
--> statement-breakpoint
ALTER TABLE "device_claims" ADD CONSTRAINT "device_claims_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;