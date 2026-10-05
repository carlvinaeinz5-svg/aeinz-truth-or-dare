import { pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const taskType = pgEnum("task_type", ["truth", "dare"]);
export const taskLevel = pgEnum("task_level", ["child", "pleasing", "dirty"]);

export const communityTasks = pgTable("community_tasks", {
  id: serial().primaryKey(),
  prompt: text().notNull(),
  type: taskType().notNull(),
  level: taskLevel().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
