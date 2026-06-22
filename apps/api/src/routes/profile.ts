import { RANKS } from "@okes/core";
import { users } from "@okes/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { parseOr400 } from "../lib/http";

const updateBody = z.object({ name: z.string().min(1).max(120) }).partial();

function rankForLevel(level: number): string {
  return RANKS[Math.min(Math.max(level - 1, 0), RANKS.length - 1)] ?? "Cadet";
}

export async function profileRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/profile", auth, async (req, reply) => {
    const [u] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!u) return reply.code(404).send({ error: "User not found" });
    return {
      profile: {
        name: u.name,
        initial: u.name.charAt(0).toUpperCase(),
        rank: rankForLevel(u.level),
        level: u.level,
        xp: u.xp,
        xpToNext: u.level * 500,
        streakDays: u.streakDays,
      },
    };
  });

  app.patch("/profile", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [u] = await db
      .update(users)
      .set(body)
      .where(eq(users.id, req.user.sub))
      .returning();
    if (!u) return reply.code(404).send({ error: "User not found" });
    return { profile: { name: u.name, level: u.level, xp: u.xp, streakDays: u.streakDays } };
  });
}
