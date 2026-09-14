CREATE TABLE "home_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"home_id" text NOT NULL,
	"provider" text NOT NULL,
	"instance_url" text NOT NULL,
	"client_id" text NOT NULL,
	"refresh_token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "home_connections_home_id_key" UNIQUE("home_id"),
	CONSTRAINT "home_connections_provider_check" CHECK ("home_connections"."provider" in ('home_assistant'))
);
--> statement-breakpoint
CREATE TABLE "home_device_metadata" (
	"id" text PRIMARY KEY NOT NULL,
	"home_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"custom_name" text,
	"room" text,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "home_device_metadata_home_id_entity_id_key" UNIQUE("home_id","entity_id")
);
--> statement-breakpoint
CREATE TABLE "home_members" (
	"id" text PRIMARY KEY NOT NULL,
	"home_id" text NOT NULL,
	"member_user_id" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'invited' NOT NULL,
	"invited_by_user_id" text,
	"joined_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "home_members_home_id_member_user_id_key" UNIQUE("home_id","member_user_id"),
	CONSTRAINT "home_members_role_check" CHECK ("home_members"."role" in ('owner', 'member')),
	CONSTRAINT "home_members_status_check" CHECK ("home_members"."status" in ('invited', 'active', 'removed'))
);
--> statement-breakpoint
CREATE TABLE "homes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	"updated_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "home_connections" ADD CONSTRAINT "home_connections_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_device_metadata" ADD CONSTRAINT "home_device_metadata_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "home_members" ADD CONSTRAINT "home_members_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_members_member_user_id_status_idx" ON "home_members" USING btree ("member_user_id","status");