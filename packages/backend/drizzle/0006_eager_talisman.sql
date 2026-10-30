CREATE TABLE "frames" (
	"id" text PRIMARY KEY NOT NULL,
	"home_id" text NOT NULL,
	"added_by_user_id" text NOT NULL,
	"oxy_session_id" text NOT NULL,
	"oxy_device_id" text,
	"name" text NOT NULL,
	"room" text,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"platform" text,
	"app_version" text,
	"fps" real,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "frames_oxy_session_id_key" UNIQUE("oxy_session_id"),
	CONSTRAINT "frames_name_length_check" CHECK (char_length("frames"."name") between 1 and 100)
);
--> statement-breakpoint
ALTER TABLE "frames" ADD CONSTRAINT "frames_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "frames_home_id_idx" ON "frames" USING btree ("home_id");