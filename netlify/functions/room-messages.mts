import { getUser } from "@netlify/identity";
import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { gameRooms, roomMessages, roomMessageViews } from "../../db/schema.js";
import type { RoomPlayer } from "../../lib/rooms.js";

const MAX_TEXT_LENGTH = 500;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;
const MAX_MEDIA_BYTES = 5 * 1024 * 1024;
const ALLOWED_AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/ogg", "audio/wav"]);
const ALLOWED_MEDIA_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

async function readLimitedBody(request: Request, maxBytes: number): Promise<Uint8Array | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    await request.body?.cancel();
    return null;
  }

  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export default async (request: Request, context: { params: Record<string, string> }) => {
  const user = await getUser();
  if (!user) return json({ error: "You must be signed in." }, 401);

  const roomId = Number(context.params.id);
  if (!Number.isInteger(roomId)) return json({ error: "Invalid game." }, 400);

  const [room] = await db.select().from(gameRooms).where(eq(gameRooms.id, roomId)).limit(1);
  if (!room) return json({ error: "That game is no longer available." }, 404);
  if (room.status === "ended") return json({ error: "This game's chat has closed." }, 410);

  const players = room.players as RoomPlayer[];
  const player = players.find((candidate) => candidate.userId === user.id);
  if (!player) return json({ error: "You are not part of this game." }, 403);

  if (request.method === "GET") {
    const url = new URL(request.url);
    await db
      .delete(roomMessages)
      .where(and(eq(roomMessages.roomId, room.id), lt(roomMessages.mediaExpiresAt, new Date())));

    const viewId = url.searchParams.get("view");
    if (viewId !== null) {
      const messageId = Number(viewId);
      if (!Number.isInteger(messageId)) return json({ error: "Invalid shared media." }, 400);

      const [message] = await db
        .select({
          mediaData: roomMessages.mediaData,
          mediaContentType: roomMessages.mediaContentType,
          recipientUserIds: roomMessages.recipientUserIds,
          mediaExpiresAt: roomMessages.mediaExpiresAt,
        })
        .from(roomMessages)
        .where(and(eq(roomMessages.id, messageId), eq(roomMessages.roomId, room.id)))
        .limit(1);
      if (!message?.mediaData || !message.mediaContentType) {
        return json({ error: "This item has expired or is no longer available." }, 410);
      }

      const recipients = message.recipientUserIds || [];
      if (!recipients.includes(user.id)) return json({ error: "This item was not shared with you." }, 403);
      if (message.mediaExpiresAt && message.mediaExpiresAt <= new Date()) {
        await db.delete(roomMessages).where(eq(roomMessages.id, messageId));
        return json({ error: "This item has expired." }, 410);
      }

      const [view] = await db
        .insert(roomMessageViews)
        .values({ messageId, userId: user.id })
        .onConflictDoNothing()
        .returning({ id: roomMessageViews.id });
      if (!view) return json({ error: "You have already viewed this item." }, 410);

      const views = await db
        .select({ userId: roomMessageViews.userId })
        .from(roomMessageViews)
        .where(eq(roomMessageViews.messageId, messageId));
      if (recipients.every((recipientId) => views.some((entry) => entry.userId === recipientId))) {
        await db.delete(roomMessages).where(eq(roomMessages.id, messageId));
      }

      return new Response(new Uint8Array(message.mediaData), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": message.mediaContentType,
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const audioId = url.searchParams.get("audio");
    if (audioId !== null) {
      const messageId = Number(audioId);
      if (!Number.isInteger(messageId)) return json({ error: "Invalid voice message." }, 400);

      const [message] = await db
        .select({ audioData: roomMessages.audioData, audioContentType: roomMessages.audioContentType })
        .from(roomMessages)
        .where(and(eq(roomMessages.id, messageId), eq(roomMessages.roomId, room.id)))
        .limit(1);
      if (!message?.audioData || !message.audioContentType) return json({ error: "Voice message not found." }, 404);

      return new Response(new Uint8Array(message.audioData), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": message.audioContentType,
          "Content-Disposition": "inline",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    const recent = await db
      .select({
        id: roomMessages.id,
        userId: roomMessages.userId,
        displayName: roomMessages.displayName,
        text: roomMessages.text,
        audioContentType: roomMessages.audioContentType,
        mediaKind: roomMessages.mediaKind,
        recipientUserIds: roomMessages.recipientUserIds,
        createdAt: roomMessages.createdAt,
      })
      .from(roomMessages)
      .where(eq(roomMessages.roomId, room.id))
      .orderBy(desc(roomMessages.createdAt), desc(roomMessages.id))
      .limit(200);
    const mediaIds = recent.filter((message) => message.mediaKind !== null).map((message) => message.id);
    const views = mediaIds.length
      ? await db
        .select({ messageId: roomMessageViews.messageId, userId: roomMessageViews.userId })
        .from(roomMessageViews)
        .where(inArray(roomMessageViews.messageId, mediaIds))
      : [];
    const viewedByMessage = new Map<number, Set<string>>();
    for (const view of views) {
      if (!viewedByMessage.has(view.messageId)) viewedByMessage.set(view.messageId, new Set());
      viewedByMessage.get(view.messageId)?.add(view.userId);
    }

    return json({
      messages: recent.reverse().map((message) => ({
        id: message.id,
        displayName: message.displayName,
        text: message.text,
        isAudio: message.audioContentType !== null,
        mediaKind: message.mediaKind,
        canViewMedia: Boolean(
          message.mediaKind &&
          message.recipientUserIds?.includes(user.id) &&
          !viewedByMessage.get(message.id)?.has(user.id)
        ),
        isRecipient: Boolean(message.recipientUserIds?.includes(user.id)),
        isSender: message.userId === user.id,
        viewCount: viewedByMessage.get(message.id)?.size || 0,
        recipientCount: message.recipientUserIds?.length || 0,
        createdAt: message.createdAt.toISOString(),
        canDelete: message.userId === user.id || room.createdBy === user.id,
      })),
    });
  }

  if (request.method === "POST") {
    const contentType = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (contentType === "application/json") {
      let body: Record<string, unknown>;
      try {
        body = await request.json();
      } catch {
        return json({ error: "Please send a valid message." }, 400);
      }

      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text || text.length > MAX_TEXT_LENGTH) {
        return json({ error: `Messages must be between 1 and ${MAX_TEXT_LENGTH} characters.` }, 400);
      }

      const [message] = await db
        .insert(roomMessages)
        .values({
          roomId: room.id,
          userId: user.id,
          displayName: player.displayName,
          text,
        })
        .returning({ id: roomMessages.id });
      return json({ id: message.id }, 201);
    }

    if (ALLOWED_AUDIO_TYPES.has(contentType)) {
      const audioData = await readLimitedBody(request, MAX_AUDIO_BYTES);
      if (!audioData) {
        return json({ error: "Voice recordings must be 5 MB or smaller." }, 413);
      }
      if (!audioData.byteLength) return json({ error: "The voice recording is empty." }, 400);

      const [message] = await db
        .insert(roomMessages)
        .values({
          roomId: room.id,
          userId: user.id,
          displayName: player.displayName,
          audioData: Buffer.from(audioData),
          audioContentType: contentType,
        })
        .returning({ id: roomMessages.id });
      return json({ id: message.id }, 201);
    }

    if (!ALLOWED_MEDIA_TYPES.has(contentType)) {
      return json({ error: "Choose a supported image or video file." }, 415);
    }
    if (players.length < 2) return json({ error: "Invite another player before sharing media." }, 409);

    const mediaData = await readLimitedBody(request, MAX_MEDIA_BYTES);
    if (!mediaData) {
      return json({ error: "Images and videos must be 5 MB or smaller." }, 413);
    }
    if (!mediaData.byteLength) return json({ error: "The selected file is empty." }, 400);

    const recipientUserIds = players
      .filter((candidate) => candidate.userId !== user.id)
      .map((candidate) => candidate.userId);
    if (!recipientUserIds.length) return json({ error: "There are no other players to share this with." }, 409);

    const [message] = await db
      .insert(roomMessages)
      .values({
        roomId: room.id,
        userId: user.id,
        displayName: player.displayName,
        mediaData: Buffer.from(mediaData),
        mediaContentType: contentType,
        mediaKind: contentType.startsWith("image/") ? "image" : "video",
        recipientUserIds,
        mediaExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      })
      .returning({ id: roomMessages.id });
    return json({ id: message.id }, 201);
  }

  if (request.method === "DELETE") {
    const messageId = Number(new URL(request.url).searchParams.get("messageId"));
    if (!Number.isInteger(messageId)) return json({ error: "Invalid message." }, 400);

    const [message] = await db
      .select({ id: roomMessages.id, userId: roomMessages.userId })
      .from(roomMessages)
      .where(and(eq(roomMessages.id, messageId), eq(roomMessages.roomId, room.id)))
      .limit(1);
    if (!message) return json({ error: "Message not found." }, 404);
    if (message.userId !== user.id && room.createdBy !== user.id) {
      return json({ error: "You can only delete your own messages." }, 403);
    }

    await db.delete(roomMessages).where(eq(roomMessages.id, message.id));
    return json({ deleted: true });
  }

  return json({ error: "Method not allowed." }, 405);
};

export const config = {
  path: "/api/rooms/:id/messages",
};
