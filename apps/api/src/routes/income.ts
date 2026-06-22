import { incomeStreams } from "@okes/db";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";

const createBody = z.object({
  label: z.string().min(1).max(120),
  expectedMinor: amountMinorField,
  currency: currencyField,
  recurring: z.boolean().default(true),
});
const updateBody = createBody.partial();

export async function incomeRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/income-streams", auth, async (req) => {
    const rows = await db
      .select()
      .from(incomeStreams)
      .where(eq(incomeStreams.userId, req.user.sub))
      .orderBy(desc(incomeStreams.createdAt));
    return { incomeStreams: rows };
  });

  app.post("/income-streams", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(incomeStreams)
      .values({ ...body, userId: req.user.sub })
      .returning();
    return reply.code(201).send({ incomeStream: row });
  });

  app.patch<{ Params: { id: string } }>("/income-streams/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(incomeStreams)
      .set(body)
      .where(and(eq(incomeStreams.id, req.params.id), eq(incomeStreams.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { incomeStream: row };
  });

  app.delete<{ Params: { id: string } }>("/income-streams/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(incomeStreams)
      .where(and(eq(incomeStreams.id, req.params.id), eq(incomeStreams.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
