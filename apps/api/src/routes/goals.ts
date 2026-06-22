import { goals } from "@okes/db";
import { and, desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";

const createBody = z.object({
  name: z.string().min(1).max(120),
  icon: z.string().min(1).max(60),
  targetMinor: amountMinorField,
  savedMinor: amountMinorField.default(0),
  currency: currencyField,
  deadline: z.string().optional(),
});
const updateBody = createBody.partial();
const contributeBody = z.object({ amountMinor: amountMinorField });

export async function goalRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/goals", auth, async (req) => {
    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.userId, req.user.sub))
      .orderBy(desc(goals.createdAt));
    return { goals: rows };
  });

  app.post("/goals", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(goals)
      .values({ ...body, userId: req.user.sub })
      .returning();
    return reply.code(201).send({ goal: row });
  });

  app.get<{ Params: { id: string } }>("/goals/:id", auth, async (req, reply) => {
    const [row] = await db
      .select()
      .from(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, req.user.sub)));
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { goal: row };
  });

  app.patch<{ Params: { id: string } }>("/goals/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(goals)
      .set(body)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { goal: row };
  });

  app.post<{ Params: { id: string } }>("/goals/:id/contribute", auth, async (req, reply) => {
    const body = parseOr400(reply, contributeBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(goals)
      .set({ savedMinor: sql`${goals.savedMinor} + ${body.amountMinor}` })
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { goal: row };
  });

  app.delete<{ Params: { id: string } }>("/goals/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(goals)
      .where(and(eq(goals.id, req.params.id), eq(goals.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
