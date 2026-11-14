import { lt } from "drizzle-orm";
import { db } from "../../db/index.js";
import { roomMessages } from "../../db/schema.js";

export default async () => {
  const deleted = await db
    .delete(roomMessages)
    .where(lt(roomMessages.mediaExpiresAt, new Date()))
    .returning({ id: roomMessages.id });

  return Response.json({ deleted: deleted.length });
};

export const config = {
  schedule: "*/15 * * * *",
};
