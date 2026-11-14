import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { communityTasks, playerProfiles } from "../db/schema.js";
import { isPrivacySensitiveTask, tasks, wildcardTasks, type TaskLevel, type TaskType } from "./tasks.js";
import { defaultStats, type PlayerStats } from "./profile.js";

export type RoomPlayer = { userId: string; displayName: string };
export type RoomBoundaries = { privacy: boolean };

export type SpinHistoryEntry = {
  player: string;
  task: string;
  type: TaskType;
  level: string;
  timestamp: string;
  date: string;
};

export type RoomState = {
  items: string[];
  level: TaskLevel;
  boundaries?: RoomBoundaries;
  wildcardMode: boolean;
  lastSelectedPlayer: string | null;
  currentTask: { task: string; type: TaskType } | null;
  pendingDouble: { task: string; type: TaskType } | null;
  usedTasks: Record<string, { truth: string[]; dare: string[] }>;
  spinHistory: SpinHistoryEntry[];
  totalSpins: number;
  completedTasks: number;
  streakCount: number;
};

export function initialRoomState(players: RoomPlayer[]): RoomState {
  return {
    items: players.map((p) => p.displayName),
    level: "child",
    boundaries: { privacy: true },
    wildcardMode: false,
    lastSelectedPlayer: null,
    currentTask: null,
    pendingDouble: null,
    usedTasks: {},
    spinHistory: [],
    totalSpins: 0,
    completedTasks: 0,
    streakCount: 0,
  };
}

async function loadCommunityTasksFor(level: TaskLevel, type: TaskType) {
  const rows = await db
    .select({ prompt: communityTasks.prompt, type: communityTasks.type })
    .from(communityTasks)
    .where(eq(communityTasks.level, level));
  return rows.filter((r) => r.type === type).map((r) => r.prompt);
}

export async function pickTask(state: RoomState): Promise<{ task: string; type: TaskType }> {
  const type: TaskType = Math.random() < 0.5 ? "truth" : "dare";
  const poolKey = state.wildcardMode ? "wildcard" : state.level;
  let pool: string[] = state.wildcardMode ? wildcardTasks[type] : tasks[state.level][type];

  if (!state.wildcardMode) {
    const community = await loadCommunityTasksFor(state.level, type);
    pool = [...pool, ...community];
  }
  if (state.boundaries?.privacy ?? true) {
    pool = pool.filter((task) => !isPrivacySensitiveTask(task));
  }

  if (pool.length === 0) {
    throw new Error("No prompts match this game's boundaries. Change the boundaries and try again.");
  }

  if (!state.usedTasks[poolKey]) state.usedTasks[poolKey] = { truth: [], dare: [] };
  const used = state.usedTasks[poolKey][type];
  let available = pool.filter((t) => !used.includes(t));

  if (available.length === 0) {
    state.usedTasks[poolKey][type] = [];
    available = [...pool];
  }

  const chosen = available[Math.floor(Math.random() * available.length)];
  state.usedTasks[poolKey][type].push(chosen);

  return { task: chosen, type };
}

export function recordHistory(state: RoomState, player: string, task: string, type: TaskType) {
  const now = new Date();
  state.spinHistory.unshift({
    player,
    task,
    type,
    level: state.wildcardMode ? "wildcard" : state.level,
    timestamp: now.toLocaleTimeString(),
    date: now.toLocaleDateString(),
  });
  if (state.spinHistory.length > 50) state.spinHistory.pop();
}

/**
 * Lifetime stats belong to the player the wheel landed on, not whoever tapped Spin — mirrors the
 * original local game where achievement conditions are keyed off the selected player's history.
 */
export async function bumpLifetimeStats(
  players: RoomPlayer[],
  displayName: string,
  patch: Partial<Pick<PlayerStats, "totalSpins" | "truthCount" | "dareCount" | "wildcardCount">> & { levelTried?: string },
) {
  const player = players.find((p) => p.displayName === displayName);
  if (!player) return;

  const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, player.userId)).limit(1);
  if (!profile) return;

  const stats: PlayerStats = { ...defaultStats(), ...(profile.stats as PlayerStats) };
  if (patch.totalSpins) stats.totalSpins += patch.totalSpins;
  if (patch.truthCount) stats.truthCount += patch.truthCount;
  if (patch.dareCount) stats.dareCount += patch.dareCount;
  if (patch.wildcardCount) stats.wildcardCount += patch.wildcardCount;
  if (patch.levelTried && !stats.levelsTried.includes(patch.levelTried)) {
    stats.levelsTried = [...stats.levelsTried, patch.levelTried];
  }

  await db.update(playerProfiles).set({ stats, updatedAt: new Date() }).where(eq(playerProfiles.id, profile.id));
}

export async function bumpCompletion(
  players: RoomPlayer[],
  displayName: string,
  patch: { completedTasks?: number; streakCount?: number },
) {
  const player = players.find((p) => p.displayName === displayName);
  if (!player) return;

  const [profile] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, player.userId)).limit(1);
  if (!profile) return;

  const stats: PlayerStats = { ...defaultStats(), ...(profile.stats as PlayerStats) };
  if (patch.completedTasks) stats.completedTasks += patch.completedTasks;
  if (typeof patch.streakCount === "number") {
    stats.streakCount = Math.max(0, patch.streakCount);
    stats.bestStreak = Math.max(stats.bestStreak, stats.streakCount);
  }

  await db.update(playerProfiles).set({ stats, updatedAt: new Date() }).where(eq(playerProfiles.id, profile.id));
}
