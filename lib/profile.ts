import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { playerProfiles } from "../db/schema.js";

export type PlayerStats = {
  totalSpins: number;
  completedTasks: number;
  streakCount: number;
  bestStreak: number;
  truthCount: number;
  dareCount: number;
  wildcardCount: number;
  levelsTried: string[];
  achievements: string[];
};

export function defaultStats(): PlayerStats {
  return {
    totalSpins: 0,
    completedTasks: 0,
    streakCount: 0,
    bestStreak: 0,
    truthCount: 0,
    dareCount: 0,
    wildcardCount: 0,
    levelsTried: [],
    achievements: [],
  };
}

function slugify(name: string) {
  return name.trim().toLowerCase();
}

function fallbackDisplayName(userId: string, email?: string | null) {
  if (email) {
    const local = email.split("@")[0];
    if (local) return local;
  }
  return `player-${userId.slice(0, 6)}`;
}

/**
 * Every account needs a globally unique display name so other players can find them to send an
 * invite. Signup only guarantees a unique email, so collisions are resolved here with a numeric
 * suffix the first time a profile is provisioned.
 */
export async function getOrCreateProfile(user: { id: string; email?: string | null; userMetadata?: Record<string, unknown> }) {
  const [existing] = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, user.id)).limit(1);
  if (existing) return existing;

  const requested = typeof user.userMetadata?.full_name === "string" && user.userMetadata.full_name.trim()
    ? (user.userMetadata.full_name as string).trim()
    : fallbackDisplayName(user.id, user.email);

  let candidate = requested;
  for (let attempt = 0; attempt < 20; attempt++) {
    const lower = slugify(candidate);
    const [taken] = await db.select({ id: playerProfiles.id }).from(playerProfiles).where(eq(playerProfiles.displayNameLower, lower)).limit(1);
    if (!taken) {
      const [created] = await db
        .insert(playerProfiles)
        .values({
          userId: user.id,
          displayName: candidate,
          displayNameLower: lower,
          hasSeenTutorial: false,
          stats: defaultStats(),
        })
        .returning();
      return created;
    }
    candidate = `${requested}${Math.floor(1000 + Math.random() * 9000)}`;
  }

  throw new Error("Could not allocate a unique display name.");
}

export function publicProfile(profile: typeof playerProfiles.$inferSelect) {
  return {
    displayName: profile.displayName,
    hasSeenTutorial: profile.hasSeenTutorial,
    stats: profile.stats as PlayerStats,
  };
}
