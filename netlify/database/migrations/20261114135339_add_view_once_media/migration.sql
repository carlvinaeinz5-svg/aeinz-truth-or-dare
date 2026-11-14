CREATE TABLE "room_message_views" (
	"id" serial PRIMARY KEY,
	"message_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "room_messages" ADD COLUMN "media_data" bytea;--> statement-breakpoint
ALTER TABLE "room_messages" ADD COLUMN "media_content_type" text;--> statement-breakpoint
ALTER TABLE "room_messages" ADD COLUMN "media_kind" text;--> statement-breakpoint
ALTER TABLE "room_messages" ADD COLUMN "recipient_user_ids" jsonb;--> statement-breakpoint
ALTER TABLE "room_messages" ADD COLUMN "media_expires_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "room_message_views_message_user_idx" ON "room_message_views" ("message_id","user_id");--> statement-breakpoint
ALTER TABLE "room_message_views" ADD CONSTRAINT "room_message_views_message_id_room_messages_id_fkey" FOREIGN KEY ("message_id") REFERENCES "room_messages"("id") ON DELETE CASCADE;