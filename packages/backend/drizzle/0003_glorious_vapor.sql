CREATE TABLE "home_events" (
	"id" text PRIMARY KEY NOT NULL,
	"home_id" text NOT NULL,
	"entity_id" text NOT NULL,
	"name" text NOT NULL,
	"room" text,
	"event_type" text NOT NULL,
	"device_class" text,
	"active" boolean,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT date_trunc('milliseconds', now()) NOT NULL,
	CONSTRAINT "home_events_event_type_check" CHECK ("home_events"."event_type" in ('motion', 'contact', 'safety', 'other'))
);
--> statement-breakpoint
ALTER TABLE "home_events" ADD CONSTRAINT "home_events_home_id_homes_id_fk" FOREIGN KEY ("home_id") REFERENCES "public"."homes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "home_events_home_id_occurred_at_idx" ON "home_events" USING btree ("home_id","occurred_at");