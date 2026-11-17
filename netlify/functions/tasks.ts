import { getUser } from "@netlify/identity";
import { desc, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { communityTasks } from "../../db/schema.js";

const VALID_TYPES = new Set(["truth", "dare"]);
const VALID_LEVELS = new Set(["child", "pleasing", "dirty"]);
const MAX_PROMPT_LENGTH = 240;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export default async (request: Request) => {
  if (request.method === "GET") {
    const tasks = await db
      .select()
      .from(communityTasks)
      .where(ne(communityTasks.level, "child"))
      .orderBy(desc(communityTasks.createdAt))
      .limit(300);

    return json({ tasks });
  }

  if (request.method === "POST") {
    if (!(await getUser())) return json({ error: "Sign in to share a community task." }, 401);

    let body: Record<string, unknown>;

    try {
      body = await request.json();
    } catch {
      return json({ error: "Please send a valid task." }, 400);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
    const level = typeof body.level === "string" ? body.level : "";

    if (prompt.length < 5 || prompt.length > MAX_PROMPT_LENGTH) {
      return json({ error: `Tasks must be between 5 and ${MAX_PROMPT_LENGTH} characters.` }, 400);
    }

    if (!VALID_TYPES.has(type) || !VALID_LEVELS.has(level)) {
      return json({ error: "Choose a valid task type and game level." }, 400);
    }
    if (level === "child") {
      return json({ error: "Community-submitted tasks are not available in Child's Play." }, 400);
    }

    const [task] = await db
      .insert(communityTasks)
      .values({
        prompt,
        type: type as "truth" | "dare",
        level: level as "child" | "pleasing" | "dirty",
      })
      .returning();

    return json({ task }, 201);
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = {
  path: "/api/tasks",
};
