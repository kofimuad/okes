import { transactions, wallets } from "@okes/db";
import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";

const listQuery = z.object({
  walletId: z.uuid().optional(),
  direction: z.enum(["in", "out"]).optional(),
  needsReview: z.enum(["true", "false"]).optional(),
  limit: z.coerce.number().int().positive().max(200).default(50),
});

const createBody = z.object({
  walletId: z.uuid(),
  direction: z.enum(["in", "out"]),
  amountMinor: amountMinorField,
  currency: currencyField,
  party: z.string().min(1).max(160),
  categoryId: z.uuid().optional(),
  occurredAt: z.coerce.date().optional(),
  auto: z.boolean().default(false),
  needsReview: z.boolean().default(false),
});
const updateBody = z
  .object({
    direction: z.enum(["in", "out"]),
    amountMinor: amountMinorField,
    party: z.string().min(1).max(160),
    categoryId: z.uuid().nullable(),
    needsReview: z.boolean(),
    occurredAt: z.coerce.date(),
  })
  .partial();

async function ownsWallet(userId: string, walletId: string): Promise<boolean> {
  const [w] = await db
    .select({ id: wallets.id })
    .from(wallets)
    .where(and(eq(wallets.id, walletId), eq(wallets.userId, userId)));
  return Boolean(w);
}

/** Signed effect of a transaction on its wallet balance (minor units). */
const signed = (direction: "in" | "out", amountMinor: number) =>
  direction === "in" ? amountMinor : -amountMinor;

export async function transactionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get<{ Querystring: Record<string, string> }>("/transactions", auth, async (req, reply) => {
    const q = parseOr400(reply, listQuery, req.query);
    if (!q) return;
    const conditions: SQL[] = [eq(transactions.userId, req.user.sub)];
    if (q.walletId) conditions.push(eq(transactions.walletId, q.walletId));
    if (q.direction) conditions.push(eq(transactions.direction, q.direction));
    if (q.needsReview) conditions.push(eq(transactions.needsReview, q.needsReview === "true"));
    const rows = await db
      .select()
      .from(transactions)
      .where(and(...conditions))
      .orderBy(desc(transactions.occurredAt))
      .limit(q.limit);
    return { transactions: rows };
  });

  app.get("/transactions/review", auth, async (req) => {
    const rows = await db
      .select()
      .from(transactions)
      .where(and(eq(transactions.userId, req.user.sub), eq(transactions.needsReview, true)))
      .orderBy(desc(transactions.occurredAt));
    return { transactions: rows };
  });

  app.post("/transactions", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    if (!(await ownsWallet(req.user.sub, body.walletId)))
      return reply.code(400).send({ error: "Unknown wallet" });

    const row = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(transactions)
        .values({ ...body, userId: req.user.sub, occurredAt: body.occurredAt ?? new Date() })
        .returning();
      await tx
        .update(wallets)
        .set({ balanceMinor: sql`${wallets.balanceMinor} + ${signed(body.direction, body.amountMinor)}` })
        .where(eq(wallets.id, body.walletId));
      return created;
    });
    return reply.code(201).send({ transaction: row });
  });

  app.patch<{ Params: { id: string } }>("/transactions/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;

    const row = await db.transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.sub)));
      if (!old) return null;

      const [updated] = await tx.update(transactions).set(body).where(eq(transactions.id, old.id)).returning();

      const delta =
        signed(body.direction ?? old.direction, body.amountMinor ?? old.amountMinor) -
        signed(old.direction, old.amountMinor);
      if (delta !== 0) {
        await tx
          .update(wallets)
          .set({ balanceMinor: sql`${wallets.balanceMinor} + ${delta}` })
          .where(eq(wallets.id, old.walletId));
      }
      return updated;
    });

    if (!row) return reply.code(404).send({ error: "Not found" });
    return { transaction: row };
  });

  app.delete<{ Params: { id: string } }>("/transactions/:id", auth, async (req, reply) => {
    const ok = await db.transaction(async (tx) => {
      const [old] = await tx
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, req.params.id), eq(transactions.userId, req.user.sub)));
      if (!old) return false;
      await tx.delete(transactions).where(eq(transactions.id, old.id));
      await tx
        .update(wallets)
        .set({ balanceMinor: sql`${wallets.balanceMinor} - ${signed(old.direction, old.amountMinor)}` })
        .where(eq(wallets.id, old.walletId));
      return true;
    });
    if (!ok) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
