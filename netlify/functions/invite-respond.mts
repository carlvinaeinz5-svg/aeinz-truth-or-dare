import { getUser } from "@netlify/identity";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gameInvites, gameRooms } from "../../db/schema.js";
import { getOrCreateProfile } from "../../lib/profile.js";
import type { RoomPlayer } from "../../lib/rooms.js";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default async (request: Request, context: { params: Record<string, string> }) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in." }, 401);

  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const inviteId = Number(context.params.id);
  if (!Number.isInteger(inviteId)) return json({ error: "Invalid invite." }, 400);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Please send a valid response." }, 400);
  }

  const action = body.action === "accept" || body.action === "decline" ? body.action : null;
  if (!action) return json({ error: "action must be 'accept' or 'decline'." }, 400);

  const [invite] = await db.select().from(gameInvites).where(eq(gameInvites.id, inviteId)).limit(1);
  if (!invite || invite.toUserId !== user.id) return json({ error: "Invite not found." }, 404);
  if (invite.status !== "pending") return json({ error: "This invite was already answered." }, 409);

  if (action === "decline") {
    await db.update(gameInvites).set({ status: "declined", respondedAt: new Date() }).where(eq(gameInvites.id, invite.id));
    return json({ status: "declined" });
  }

  const me = await getOrCreateProfile(user);
  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, invite.roomId)).limit(1);
  if (!room) return json({ error: "That game is no longer available." }, 404);

  const players = room.players as RoomPlayer[];
  const alreadyIn = players.some((p) => p.userId === user.id);
  const nextPlayers = alreadyIn ? players : [...players, { userId: user.id, displayName: me.displayName }];

  const nextState = { ...(room.state as Record<string, unknown>) };
  nextState.items = nextPlayers.map((p) => p.displayName);

  await db
    .update(gameRooms)
    .set({ players: nextPlayers, status: "active", state: nextState, updatedAt: new Date() })
    .where(eq(gameRooms.id, room.id));

  await db.update(gameInvites).set({ status: "accepted", respondedAt: new Date() }).where(eq(gameInvites.id, invite.id));

  return json({ status: "accepted", roomId: room.id });
};

export const config = {
  path: "/api/invites/:id",
};
