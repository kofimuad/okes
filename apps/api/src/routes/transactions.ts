import { transactions, wallets } from "@okes/db";
import { and, desc, eq, gte, inArray, lte, sql, type SQL } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";
import { notifyCapCrossing } from "../lib/push";

const recurrenceEnum = z.enum(["none", "daily", "weekly", "monthly"]);
const listQuery = z.object({
  walletId: z.uuid().optional(),
  direction: z.enum(["in", "out"]).optional(),
  needsReview: z.enum(["true", "false"]).optional(),
  paid: z.enum(["true", "false"]).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
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
  paid: z.boolean().default(true),
  recurrence: recurrenceEnum.default("none"),
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
    paid: z.boolean(),
    recurrence: recurrenceEnum,
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

/** A planned (unpaid) transaction doesn't move the wallet balance. */
const contribution = (paid: boolean, direction: "in" | "out", amountMinor: number) =>
  paid ? signed(direction, amountMinor) : 0;

function nextOccurrence(from: Date, recurrence: string): Date {
  const d = new Date(from);
  if (recurrence === "daily") d.setDate(d.getDate() + 1);
  else if (recurrence === "weekly") d.setDate(d.getDate() + 7);
  else if (recurrence === "monthly") d.setMonth(d.getMonth() + 1);
  return d;
}

export async function transactionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get<{ Querystring: Record<string, string> }>("/transactions", auth, async (req, reply) => {
    const q = parseOr400(reply, listQuery, req.query);
    if (!q) return;
    const conditions: SQL[] = [eq(transactions.userId, req.user.sub)];
    if (q.walletId) conditions.push(eq(transactions.walletId, q.walletId));
    if (q.direction) conditions.push(eq(transactions.direction, q.direction));
    if (q.needsReview) conditions.push(eq(transactions.needsReview, q.needsReview === "true"));
    if (q.paid) conditions.push(eq(transactions.paid, q.paid === "true"));
    if (q.from) conditions.push(gte(transactions.occurredAt, q.from));
    if (q.to) conditions.push(lte(transactions.occurredAt, q.to));
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
      const effect = contribution(body.paid, body.direction, body.amountMinor);
      if (effect !== 0) {
        await tx
          .update(wallets)
          .set({ balanceMinor: sql`${wallets.balanceMinor} + ${effect}` })
          .where(eq(wallets.id, body.walletId));
      }
      return created;
    });
    if (body.paid && body.direction === "out") void notifyCapCrossing(req.user.sub, body.categoryId ?? null, body.amountMinor);
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

      const newPaid = body.paid ?? old.paid;
      const newDir = body.direction ?? old.direction;
      const newAmt = body.amountMinor ?? old.amountMinor;
      const delta = contribution(newPaid, newDir, newAmt) - contribution(old.paid, old.direction, old.amountMinor);
      if (delta !== 0) {
        await tx
          .update(wallets)
          .set({ balanceMinor: sql`${wallets.balanceMinor} + ${delta}` })
          .where(eq(wallets.id, old.walletId));
      }

      // When a recurring planned item is paid, queue the next occurrence.
      const recurrence = body.recurrence ?? old.recurrence;
      if (!old.paid && newPaid && recurrence !== "none") {
        await tx.insert(transactions).values({
          userId: req.user.sub,
          walletId: old.walletId,
          direction: newDir,
          amountMinor: newAmt,
          currency: old.currency,
          party: old.party,
          categoryId: old.categoryId,
          occurredAt: nextOccurrence(updated!.occurredAt, recurrence),
          paid: false,
          recurrence,
        });
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
      const effect = contribution(old.paid, old.direction, old.amountMinor);
      if (effect !== 0) {
        await tx
          .update(wallets)
          .set({ balanceMinor: sql`${wallets.balanceMinor} - ${effect}` })
          .where(eq(wallets.id, old.walletId));
      }
      return true;
    });
    if (!ok) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
