CREATE TABLE "room_messages" (
	"id" serial PRIMARY KEY,
	"room_id" integer NOT NULL,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"text" text,
	"audio_data" bytea,
	"audio_content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "room_messages_room_created_idx" ON "room_messages" ("room_id","created_at");--> statement-breakpoint
ALTER TABLE "room_messages" ADD CONSTRAINT "room_messages_room_id_game_rooms_id_fkey" FOREIGN KEY ("room_id") REFERENCES "game_rooms"("id") ON DELETE CASCADE;