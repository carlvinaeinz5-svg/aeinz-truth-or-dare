CREATE TYPE "task_level" AS ENUM('child', 'pleasing', 'dirty');--> statement-breakpoint
CREATE TYPE "task_type" AS ENUM('truth', 'dare');--> statement-breakpoint
CREATE TABLE "community_tasks" (
	"id" serial PRIMARY KEY,
	"prompt" text NOT NULL,
	"type" "task_type" NOT NULL,
	"level" "task_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
