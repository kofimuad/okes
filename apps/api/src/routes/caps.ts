import { caps, transactions } from "@okes/db";
import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400, periodStart } from "../lib/http";

const createBody = z.object({
  categoryId: z.uuid(),
  limitMinor: amountMinorField,
  currency: currencyField,
  period: z.enum(["daily", "weekly", "monthly"]).default("monthly"),
  alertThresholds: z.array(z.number().int().min(1).max(100)).default([70, 90, 100]),
  lockAtLimit: z.boolean().default(false),
  notifyCrew: z.boolean().default(false),
});
const updateBody = createBody.partial();

function statusFor(spent: number, limit: number): "on_track" | "near" | "over" {
  if (limit <= 0) return "on_track";
  const pct = spent / limit;
  if (pct >= 1) return "over";
  if (pct >= 0.8) return "near";
  return "on_track";
}

export async function capRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/caps", auth, async (req) => {
    const rows = await db.select().from(caps).where(eq(caps.userId, req.user.sub));
    const caps_ = [];
    for (const c of rows) {
      const [r] = await db
        .select({ spent: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)::int` })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, req.user.sub),
            eq(transactions.categoryId, c.categoryId),
            eq(transactions.direction, "out"),
            eq(transactions.paid, true),
            gte(transactions.occurredAt, periodStart(c.period)),
          ),
        );
      const spentMinor = Number(r?.spent ?? 0);
      caps_.push({ ...c, spentMinor, status: statusFor(spentMinor, c.limitMinor) });
    }
    return { caps: caps_ };
  });

  app.post("/caps", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(caps)
      .values({ ...body, userId: req.user.sub })
      .returning();
    return reply.code(201).send({ cap: row });
  });

  app.patch<{ Params: { id: string } }>("/caps/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(caps)
      .set(body)
      .where(and(eq(caps.id, req.params.id), eq(caps.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { cap: row };
  });

  app.delete<{ Params: { id: string } }>("/caps/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(caps)
      .where(and(eq(caps.id, req.params.id), eq(caps.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
