import { getUser } from "@netlify/identity";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gameInvites, gameRooms, playerProfiles } from "../../db/schema.js";
import { getOrCreateProfile } from "../../lib/profile.js";
import { initialRoomState, type RoomPlayer } from "../../lib/rooms.js";

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default async (request: Request) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in." }, 401);

  if (request.method === "GET") {
    const [incoming, outgoing] = await Promise.all([
      db
        .select()
        .from(gameInvites)
        .where(and(eq(gameInvites.toUserId, user.id), eq(gameInvites.status, "pending")))
        .orderBy(desc(gameInvites.createdAt)),
      db
        .select()
        .from(gameInvites)
        .where(and(eq(gameInvites.fromUserId, user.id), eq(gameInvites.status, "pending")))
        .orderBy(desc(gameInvites.createdAt)),
    ]);

    const openRooms = await db.select().from(gameRooms).where(inArray(gameRooms.status, ["lobby", "active"]));
    const myRooms = openRooms.filter((room) => (room.players as RoomPlayer[]).some((p) => p.userId === user.id));

    return json({
      incoming: incoming.map((i) => ({ id: i.id, roomId: i.roomId, fromDisplayName: i.fromDisplayName, createdAt: i.createdAt })),
      outgoing: outgoing.map((i) => ({ id: i.id, roomId: i.roomId, toDisplayName: i.toDisplayName, createdAt: i.createdAt })),
      rooms: myRooms.map((r) => ({ id: r.id, status: r.status, players: r.players })),
    });
  }

  if (request.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Please send a valid invite." }, 400);
    }

    const toDisplayName = typeof body.toDisplayName === "string" ? body.toDisplayName.trim() : "";
    if (!toDisplayName) return json({ error: "Enter the display name of the player you want to invite." }, 400);

    const me = await getOrCreateProfile(user);

    if (toDisplayName.toLowerCase() === me.displayNameLower) {
      return json({ error: "You can't invite yourself." }, 400);
    }

    const [target] = await db
      .select()
      .from(playerProfiles)
      .where(eq(playerProfiles.displayNameLower, toDisplayName.toLowerCase()))
      .limit(1);

    if (!target) {
      return json({ error: `No player named "${toDisplayName}" has signed up yet.` }, 404);
    }

    const existingDuplicate = await db
      .select({ id: gameInvites.id })
      .from(gameInvites)
      .where(and(eq(gameInvites.fromUserId, user.id), eq(gameInvites.toUserId, target.userId), eq(gameInvites.status, "pending")))
      .limit(1);

    if (existingDuplicate.length > 0) {
      return json({ error: `You already have a pending invite to ${target.displayName}.` }, 409);
    }

    const openRooms = await db.select().from(gameRooms).where(inArray(gameRooms.status, ["lobby", "active"]));
    const isMember = (r: (typeof openRooms)[number]) => (r.players as RoomPlayer[]).some((p) => p.userId === user.id);
    const requestedRoomId = Number(body.roomId);

    // Inviting from inside a game adds the friend to that game; otherwise reuse the inviter's own open room.
    let room = Number.isInteger(requestedRoomId)
      ? openRooms.find((r) => r.id === requestedRoomId && isMember(r))
      : undefined;
    if (!room) room = openRooms.find((r) => r.createdBy === user.id && isMember(r));

    if (room && (room.players as RoomPlayer[]).some((p) => p.userId === target.userId)) {
      return json({ error: `${target.displayName} is already in this game.` }, 409);
    }

    if (!room) {
      const players: RoomPlayer[] = [{ userId: user.id, displayName: me.displayName }];
      const [created] = await db
        .insert(gameRooms)
        .values({
          createdBy: user.id,
          status: "lobby",
          players,
          state: initialRoomState(players),
        })
        .returning();
      room = created;
    }

    const [invite] = await db
      .insert(gameInvites)
      .values({
        roomId: room.id,
        fromUserId: user.id,
        fromDisplayName: me.displayName,
        toUserId: target.userId,
        toDisplayName: target.displayName,
        status: "pending",
      })
      .returning();

    return json({ invite: { id: invite.id, roomId: invite.roomId, toDisplayName: invite.toDisplayName } }, 201);
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = {
  path: "/api/invites",
};
