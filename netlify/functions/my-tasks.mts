import { and, desc, eq } from "drizzle-orm";
import { getUser } from "@netlify/identity";
import { db } from "../../db/index.js";
import { userCustomTasks } from "../../db/schema.js";

const VALID_TYPES = new Set(["truth", "dare"]);
const VALID_LEVELS = new Set(["child", "pleasing", "dirty"]);
const MAX_PROMPT_LENGTH = 240;
const MAX_USER_TASKS = 200;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default async (request: Request) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in to manage your prompt deck." }, 401);

  if (request.method === "GET") {
    const tasks = await db
      .select({
        id: userCustomTasks.id,
        prompt: userCustomTasks.prompt,
        type: userCustomTasks.type,
        level: userCustomTasks.level,
        createdAt: userCustomTasks.createdAt,
      })
      .from(userCustomTasks)
      .where(eq(userCustomTasks.userId, user.id))
      .orderBy(desc(userCustomTasks.createdAt), desc(userCustomTasks.id));

    return json({ tasks });
  }

  if (request.method === "POST" || request.method === "PATCH") {
    const isUpdate = request.method === "PATCH";
    const taskId = Number(new URL(request.url).searchParams.get("taskId"));
    if (isUpdate && (!Number.isInteger(taskId) || taskId < 1)) {
      return json({ error: "Choose a valid prompt to update." }, 400);
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Please send a valid custom prompt." }, 400);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const type = typeof body.type === "string" ? body.type : "";
    const level = typeof body.level === "string" ? body.level : "";
    if (prompt.length < 5 || prompt.length > MAX_PROMPT_LENGTH) {
      return json({ error: `Prompts must be between 5 and ${MAX_PROMPT_LENGTH} characters.` }, 400);
    }
    if (!VALID_TYPES.has(type) || !VALID_LEVELS.has(level)) {
      return json({ error: "Choose a valid prompt type and level." }, 400);
    }

    const existing = await db
      .select({
        id: userCustomTasks.id,
        prompt: userCustomTasks.prompt,
        type: userCustomTasks.type,
        level: userCustomTasks.level,
      })
      .from(userCustomTasks)
      .where(eq(userCustomTasks.userId, user.id));

    if (!isUpdate && existing.length >= MAX_USER_TASKS) {
      return json({ error: `Your deck can contain up to ${MAX_USER_TASKS} prompts.` }, 409);
    }
    if (existing.some((task) =>
      task.id !== taskId &&
      task.level === level &&
      task.type === type &&
      task.prompt.toLowerCase() === prompt.toLowerCase()
    )) {
      return json({ error: "That prompt is already in your deck for this level and type." }, 409);
    }

    if (isUpdate) {
      const [task] = await db
        .update(userCustomTasks)
        .set({
          prompt,
          type: type as "truth" | "dare",
          level: level as "child" | "pleasing" | "dirty",
        })
        .where(and(eq(userCustomTasks.id, taskId), eq(userCustomTasks.userId, user.id)))
        .returning({
          id: userCustomTasks.id,
          prompt: userCustomTasks.prompt,
          type: userCustomTasks.type,
          level: userCustomTasks.level,
          createdAt: userCustomTasks.createdAt,
        });
      if (!task) return json({ error: "That prompt is not in your deck." }, 404);
      return json({ task });
    }

    const [task] = await db
      .insert(userCustomTasks)
      .values({
        userId: user.id,
        prompt,
        type: type as "truth" | "dare",
        level: level as "child" | "pleasing" | "dirty",
      })
      .returning({
        id: userCustomTasks.id,
        prompt: userCustomTasks.prompt,
        type: userCustomTasks.type,
        level: userCustomTasks.level,
        createdAt: userCustomTasks.createdAt,
      });

    return json({ task }, 201);
  }

  if (request.method === "DELETE") {
    const taskId = Number(new URL(request.url).searchParams.get("taskId"));
    if (!Number.isInteger(taskId) || taskId < 1) return json({ error: "Choose a valid prompt to remove." }, 400);

    const [deleted] = await db
      .delete(userCustomTasks)
      .where(and(eq(userCustomTasks.id, taskId), eq(userCustomTasks.userId, user.id)))
      .returning({ id: userCustomTasks.id });
    if (!deleted) return json({ error: "That prompt is not in your deck." }, 404);

    return json({ deleted: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = {
  path: "/api/my-tasks",
};
