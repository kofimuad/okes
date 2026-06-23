import { transactions, wallets } from "@okes/db";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";
import { notifyCapCrossing } from "../lib/push";

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
const importBody = z.object({
  items: z
    .array(
      z.object({
        externalRef: z.string().min(1).max(160),
        walletId: z.uuid(),
        direction: z.enum(["in", "out"]),
        amountMinor: amountMinorField,
        currency: currencyField,
        party: z.string().min(1).max(160),
        occurredAt: z.coerce.date().optional(),
      }),
    )
    .max(200),
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
    if (body.direction === "out") void notifyCapCrossing(req.user.sub, body.categoryId ?? null, body.amountMinor);
    return reply.code(201).send({ transaction: row });
  });

  // Bulk import of auto-captured (e.g. SMS-parsed) transactions; dedupes by externalRef.
  app.post("/transactions/import", auth, async (req, reply) => {
    const body = parseOr400(reply, importBody, req.body);
    if (!body) return;
    if (body.items.length === 0) return { imported: 0, skipped: 0 };

    const result = await db.transaction(async (tx) => {
      const owned = new Set(
        (await tx.select({ id: wallets.id }).from(wallets).where(eq(wallets.userId, req.user.sub))).map((w) => w.id),
      );
      const refs = body.items.map((i) => i.externalRef);
      const existing = new Set(
        (
          await tx
            .select({ ref: transactions.externalRef })
            .from(transactions)
            .where(and(eq(transactions.userId, req.user.sub), inArray(transactions.externalRef, refs)))
        ).map((r) => r.ref),
      );

      let imported = 0;
      let skipped = 0;
      for (const it of body.items) {
        if (existing.has(it.externalRef) || !owned.has(it.walletId)) {
          skipped++;
          continue;
        }
        await tx.insert(transactions).values({
          userId: req.user.sub,
          walletId: it.walletId,
          direction: it.direction,
          amountMinor: it.amountMinor,
          currency: it.currency,
          party: it.party,
          occurredAt: it.occurredAt ?? new Date(),
          auto: true,
          needsReview: true,
          externalRef: it.externalRef,
        });
        await tx
          .update(wallets)
          .set({ balanceMinor: sql`${wallets.balanceMinor} + ${signed(it.direction, it.amountMinor)}` })
          .where(eq(wallets.id, it.walletId));
        existing.add(it.externalRef);
        imported++;
      }
      return { imported, skipped };
    });

    return reply.code(201).send(result);
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
