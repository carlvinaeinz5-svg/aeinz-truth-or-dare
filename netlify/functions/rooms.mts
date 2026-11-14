import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gameRooms, roomMessages } from "../../db/schema.js";
import {
  bumpCompletion,
  bumpLifetimeStats,
  pickTask,
  recordHistory,
  type RoomPlayer,
  type RoomState,
} from "../../lib/rooms.js";
import { isPrivacySensitiveTask, type TaskLevel, type TaskTheme } from "../../lib/tasks.js";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

const VALID_LEVELS = new Set(["child", "pleasing", "dirty"]);
const VALID_THEMES = new Set(["classic", "road_trip", "music", "aeinz_sooth"]);

export default async (request: Request, context: { params: Record<string, string> }) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in." }, 401);

  const roomId = Number(context.params.id);
  if (!Number.isInteger(roomId)) return json({ error: "Invalid game." }, 400);

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) return json({ error: "That game is no longer available." }, 404);

  const players = room.players as RoomPlayer[];
  const me = players.find((p) => p.userId === user.id);
  if (!me) return json({ error: "You are not part of this game." }, 403);

  if (request.method === "GET") {
    return json({
      room: {
        id: room.id,
        status: room.status,
        players,
        state: room.state,
        you: me.displayName,
        isHost: room.createdBy === user.id,
      },
    });
  }

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid action." }, 400);
  }

  const state = { ...(room.state as RoomState) };
  state.boundaries = state.boundaries ?? { privacy: true };
  state.theme = state.theme && VALID_THEMES.has(state.theme) ? state.theme : "classic";
  state.includeCustomTasks = Boolean(state.includeCustomTasks);
  const type = body.type;

  if (type === "spin") {
    if (players.length < 2) return json({ error: "Waiting for another player to join." }, 409);
    const winIdx = Math.floor(Math.random() * state.items.length);
    state.lastSelectedPlayer = state.items[winIdx];
    state.pendingDouble = null;
    state.totalSpins += 1;

    const picked = await pickTask(state, room.createdBy);
    state.currentTask = picked;
    recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);

    await bumpLifetimeStats(players, state.lastSelectedPlayer, {
      totalSpins: 1,
      truthCount: picked.type === "truth" ? 1 : 0,
      dareCount: picked.type === "dare" ? 1 : 0,
      wildcardCount: state.wildcardMode ? 1 : 0,
      levelTried: state.wildcardMode ? "wildcard" : state.level,
    });
  } else if (type === "reroll") {
    if (!state.lastSelectedPlayer) return json({ error: "No active turn to re-roll." }, 409);
    const picked = await pickTask(state, room.createdBy);
    state.currentTask = picked;
    recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
  } else if (type === "mark_done") {
    if (!state.lastSelectedPlayer) return json({ error: "No active turn." }, 409);
    state.completedTasks += 1;
    state.streakCount += 1;
    await bumpCompletion(players, state.lastSelectedPlayer, { completedTasks: 1, streakCount: state.streakCount });
    state.lastSelectedPlayer = null;
    state.currentTask = null;
  } else if (type === "double_preview") {
    if (!state.lastSelectedPlayer) return json({ error: "No active turn." }, 409);
    const picked = await pickTask(state, room.createdBy);
    state.pendingDouble = picked;
  } else if (type === "double_accept") {
    if (!state.lastSelectedPlayer || !state.pendingDouble) return json({ error: "No double or nothing pending." }, 409);
    state.streakCount *= 2;
    state.completedTasks += 1;
    await bumpCompletion(players, state.lastSelectedPlayer, { completedTasks: 1, streakCount: state.streakCount });
    state.pendingDouble = null;
    state.lastSelectedPlayer = null;
    state.currentTask = null;
  } else if (type === "double_decline") {
    state.pendingDouble = null;
  } else if (type === "set_level") {
    const level = body.level;
    if (typeof level !== "string" || !VALID_LEVELS.has(level)) return json({ error: "Invalid level." }, 400);
    state.level = level as TaskLevel;
    if (state.lastSelectedPlayer) {
      const picked = await pickTask(state, room.createdBy);
      state.currentTask = picked;
      recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
    }
  } else if (type === "toggle_wildcard") {
    state.wildcardMode = Boolean(body.enabled);
    if (state.lastSelectedPlayer) {
      const picked = await pickTask(state, room.createdBy);
      state.currentTask = picked;
      recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
    }
  } else if (type === "set_boundaries") {
    if (typeof body.privacy !== "boolean") return json({ error: "Choose whether to filter privacy-related prompts." }, 400);
    state.boundaries = { privacy: body.privacy };
    if (
      body.privacy &&
      state.lastSelectedPlayer &&
      state.currentTask &&
      isPrivacySensitiveTask(state.currentTask.task)
    ) {
      const picked = await pickTask(state, room.createdBy);
      state.currentTask = picked;
      recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
    }
  } else if (type === "set_theme") {
    if (typeof body.theme !== "string" || !VALID_THEMES.has(body.theme)) {
      return json({ error: "Choose a valid prompt theme." }, 400);
    }
    state.theme = body.theme as TaskTheme;
    if (state.lastSelectedPlayer) {
      const picked = await pickTask(state, room.createdBy);
      state.currentTask = picked;
      recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
    }
  } else if (type === "toggle_custom_tasks") {
    if (user.id !== room.createdBy) return json({ error: "Only the room host can share their saved prompts." }, 403);
    if (typeof body.enabled !== "boolean") return json({ error: "Choose whether to use the host's saved prompts." }, 400);
    state.includeCustomTasks = body.enabled;
    if (state.lastSelectedPlayer) {
      const picked = await pickTask(state, room.createdBy);
      state.currentTask = picked;
      recordHistory(state, state.lastSelectedPlayer, picked.task, picked.type);
    }
  } else if (type === "leave") {
    const remaining = players.filter((p) => p.userId !== user.id);
    const ended = remaining.length < 2;
    await db
      .update(gameRooms)
      .set({
        players: remaining,
        status: ended ? "ended" : room.status,
        state: { ...state, items: remaining.map((p) => p.displayName) },
        updatedAt: new Date(),
      })
      .where(eq(gameRooms.id, room.id));
    if (ended) {
      await db.delete(roomMessages).where(eq(roomMessages.roomId, room.id));
    }
    return json({ left: true });
  } else {
    return json({ error: "Unknown action." }, 400);
  }

  const [updated] = await db
    .update(gameRooms)
    .set({ state, updatedAt: new Date() })
    .where(eq(gameRooms.id, room.id))
    .returning();

  return json({
    room: {
      id: updated.id,
      status: updated.status,
      players,
      state: updated.state,
      you: me.displayName,
      isHost: room.createdBy === user.id,
    },
  });
};

export const config = {
  path: "/api/rooms/:id",
};
