CREATE TYPE "invite_status" AS ENUM('pending', 'accepted', 'declined', 'cancelled');--> statement-breakpoint
CREATE TYPE "room_status" AS ENUM('lobby', 'active', 'ended');--> statement-breakpoint
CREATE TABLE "game_invites" (
	"id" serial PRIMARY KEY,
	"room_id" integer NOT NULL,
	"from_user_id" text NOT NULL,
	"from_display_name" text NOT NULL,
	"to_user_id" text NOT NULL,
	"to_display_name" text NOT NULL,
	"status" "invite_status" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "game_rooms" (
	"id" serial PRIMARY KEY,
	"created_by" text NOT NULL,
	"status" "room_status" NOT NULL,
	"players" jsonb NOT NULL,
	"state" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_profiles" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"display_name" text NOT NULL,
	"display_name_lower" text NOT NULL,
	"has_seen_tutorial" boolean NOT NULL,
	"stats" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_user_id_idx" ON "player_profiles" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "player_profiles_display_name_lower_idx" ON "player_profiles" ("display_name_lower");--> statement-breakpoint
ALTER TABLE "game_invites" ADD CONSTRAINT "game_invites_room_id_game_rooms_id_fkey" FOREIGN KEY ("room_id") REFERENCES "game_rooms"("id");