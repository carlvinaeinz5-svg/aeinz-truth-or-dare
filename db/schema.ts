import { bytea, boolean, index, integer, jsonb, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const taskType = pgEnum("task_type", ["truth", "dare"]);
export const taskLevel = pgEnum("task_level", ["child", "pleasing", "dirty"]);
export const inviteStatus = pgEnum("invite_status", ["pending", "accepted", "declined", "cancelled"]);
export const roomStatus = pgEnum("room_status", ["lobby", "active", "ended"]);

export const communityTasks = pgTable("community_tasks", {
  id: serial().primaryKey(),
  prompt: text().notNull(),
  type: taskType().notNull(),
  level: taskLevel().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const playerProfiles = pgTable("player_profiles", {
  id: serial().primaryKey(),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  displayNameLower: text("display_name_lower").notNull(),
  hasSeenTutorial: boolean("has_seen_tutorial").notNull(),
  stats: jsonb().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdIdx: uniqueIndex("player_profiles_user_id_idx").on(table.userId),
  displayNameLowerIdx: uniqueIndex("player_profiles_display_name_lower_idx").on(table.displayNameLower),
}));

export const gameRooms = pgTable("game_rooms", {
  id: serial().primaryKey(),
  createdBy: text("created_by").notNull(),
  status: roomStatus().notNull(),
  players: jsonb().notNull(),
  state: jsonb().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gameInvites = pgTable("game_invites", {
  id: serial().primaryKey(),
  roomId: integer("room_id").notNull().references(() => gameRooms.id),
  fromUserId: text("from_user_id").notNull(),
  fromDisplayName: text("from_display_name").notNull(),
  toUserId: text("to_user_id").notNull(),
  toDisplayName: text("to_display_name").notNull(),
  status: inviteStatus().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  respondedAt: timestamp("responded_at", { withTimezone: true }),
});

export const roomMessages = pgTable("room_messages", {
  id: serial().primaryKey(),
  roomId: integer("room_id").notNull().references(() => gameRooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  displayName: text("display_name").notNull(),
  text: text(),
  audioData: bytea("audio_data"),
  audioContentType: text("audio_content_type"),
  mediaData: bytea("media_data"),
  mediaContentType: text("media_content_type"),
  mediaKind: text("media_kind"),
  recipientUserIds: jsonb("recipient_user_ids").$type<string[]>(),
  mediaExpiresAt: timestamp("media_expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  roomCreatedIdx: index("room_messages_room_created_idx").on(table.roomId, table.createdAt),
}));

export const roomMessageViews = pgTable("room_message_views", {
  id: serial().primaryKey(),
  messageId: integer("message_id").notNull().references(() => roomMessages.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  viewedAt: timestamp("viewed_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  messageUserIdx: uniqueIndex("room_message_views_message_user_idx").on(table.messageId, table.userId),
}));
