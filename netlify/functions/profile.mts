import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { playerProfiles } from "../../db/schema.js";
import { getOrCreateProfile, publicProfile, type PlayerStats } from "../../lib/profile.js";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

const STAT_KEYS: (keyof PlayerStats)[] = [
  "totalSpins",
  "completedTasks",
  "streakCount",
  "bestStreak",
  "truthCount",
  "dareCount",
  "wildcardCount",
];

export default async (request: Request) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in." }, 401);

  if (request.method === "GET") {
    const profile = await getOrCreateProfile(user);
    return json({ profile: publicProfile(profile) });
  }

  if (request.method === "PATCH") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Please send a valid update." }, 400);
    }

    const profile = await getOrCreateProfile(user);
    const nextStats: PlayerStats = { ...(profile.stats as PlayerStats) };
    let hasSeenTutorial = profile.hasSeenTutorial;
    let displayName = profile.displayName;
    let displayNameLower = profile.displayNameLower;

    if (body.hasSeenTutorial === true) {
      hasSeenTutorial = true;
    }

    if (body.stats && typeof body.stats === "object") {
      const incoming = body.stats as Record<string, unknown>;
      for (const key of STAT_KEYS) {
        if (typeof incoming[key] === "number" && Number.isFinite(incoming[key])) {
          nextStats[key] = Math.max(0, Math.floor(incoming[key] as number));
        }
      }
      if (Array.isArray(incoming.levelsTried)) {
        nextStats.levelsTried = Array.from(new Set([...nextStats.levelsTried, ...incoming.levelsTried.filter((l) => typeof l === "string")])) as string[];
      }
      if (Array.isArray(incoming.achievements)) {
        nextStats.achievements = Array.from(new Set([...nextStats.achievements, ...incoming.achievements.filter((a) => typeof a === "string")])) as string[];
      }
      nextStats.bestStreak = Math.max(nextStats.bestStreak, nextStats.streakCount);
    }

    if (typeof body.displayName === "string" && body.displayName.trim() && body.displayName.trim() !== profile.displayName) {
      const trimmed = body.displayName.trim().slice(0, 24);
      const lower = trimmed.toLowerCase();
      const [taken] = await db
        .select({ id: playerProfiles.id })
        .from(playerProfiles)
        .where(eq(playerProfiles.displayNameLower, lower))
        .limit(1);
      if (taken && taken.id !== profile.id) {
        return json({ error: "That display name is already taken." }, 409);
      }
      displayName = trimmed;
      displayNameLower = lower;
    }

    const [updated] = await db
      .update(playerProfiles)
      .set({ hasSeenTutorial, stats: nextStats, displayName, displayNameLower, updatedAt: new Date() })
      .where(eq(playerProfiles.id, profile.id))
      .returning();

    return json({ profile: publicProfile(updated) });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = {
  path: "/api/profile",
};
