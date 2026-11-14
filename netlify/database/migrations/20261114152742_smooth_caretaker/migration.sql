CREATE TABLE "user_custom_tasks" (
	"id" serial PRIMARY KEY,
	"user_id" text NOT NULL,
	"prompt" text NOT NULL,
	"type" "task_type" NOT NULL,
	"level" "task_level" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "user_custom_tasks_user_level_type_idx" ON "user_custom_tasks" ("user_id","level","type");--> statement-breakpoint
CREATE UNIQUE INDEX "user_custom_tasks_user_prompt_idx" ON "user_custom_tasks" ("user_id","level","type","prompt");