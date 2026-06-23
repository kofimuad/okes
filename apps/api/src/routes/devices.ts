import { deviceTokens, users } from "@okes/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { parseOr400 } from "../lib/http";

const deviceBody = z.object({ token: z.string().min(1).max(255), platform: z.string().max(16).optional() });
const prefsBody = z.object({ push: z.boolean(), caps: z.boolean(), summary: z.boolean(), crew: z.boolean() }).partial();

export async function deviceRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.post("/devices", auth, async (req, reply) => {
    const b = parseOr400(reply, deviceBody, req.body);
    if (!b) return;
    await db
      .insert(deviceTokens)
      .values({ userId: req.user.sub, token: b.token, platform: b.platform ?? "android" })
      .onConflictDoUpdate({ target: deviceTokens.token, set: { userId: req.user.sub, platform: b.platform ?? "android" } });
    return reply.code(201).send({ ok: true });
  });

  app.get("/notifications/prefs", auth, async (req, reply) => {
    const [u] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!u) return reply.code(404).send({ error: "User not found" });
    return { prefs: { push: u.notifyPush, caps: u.notifyCaps, summary: u.notifySummary, crew: u.notifyCrew } };
  });

  app.patch("/notifications/prefs", auth, async (req, reply) => {
    const b = parseOr400(reply, prefsBody, req.body);
    if (!b) return;
    const set: Partial<{ notifyPush: boolean; notifyCaps: boolean; notifySummary: boolean; notifyCrew: boolean }> = {};
    if (b.push !== undefined) set.notifyPush = b.push;
    if (b.caps !== undefined) set.notifyCaps = b.caps;
    if (b.summary !== undefined) set.notifySummary = b.summary;
    if (b.crew !== undefined) set.notifyCrew = b.crew;
    const [u] = await db.update(users).set(set).where(eq(users.id, req.user.sub)).returning();
    if (!u) return reply.code(404).send({ error: "User not found" });
    return { prefs: { push: u.notifyPush, caps: u.notifyCaps, summary: u.notifySummary, crew: u.notifyCrew } };
  });
}
