import { transactions, wallets } from "@okes/db";
import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, parseOr400 } from "../lib/http";

const body = z.object({
  fromWalletId: z.uuid(),
  toWalletId: z.uuid(),
  amountMinor: amountMinorField,
  note: z.string().max(160).optional(),
});

/** Move money between two of the user's own wallets (two legs, atomic). */
export async function transferRoutes(app: FastifyInstance) {
  app.post("/transfers", { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = parseOr400(reply, body, req.body);
    if (!b) return;
    if (b.fromWalletId === b.toWalletId)
      return reply.code(400).send({ error: "Choose two different wallets" });
    if (b.amountMinor <= 0)
      return reply.code(400).send({ error: "Amount must be greater than zero" });

    const ok = await db.transaction(async (tx) => {
      const owned = await tx.select().from(wallets).where(eq(wallets.userId, req.user.sub));
      const from = owned.find((w) => w.id === b.fromWalletId);
      const to = owned.find((w) => w.id === b.toWalletId);
      if (!from || !to) return false;
      const now = new Date();
      await tx.insert(transactions).values([
        { userId: req.user.sub, walletId: from.id, direction: "out", amountMinor: b.amountMinor, currency: from.currency, party: `Transfer to ${to.label}`, occurredAt: now },
        { userId: req.user.sub, walletId: to.id, direction: "in", amountMinor: b.amountMinor, currency: to.currency, party: `Transfer from ${from.label}`, occurredAt: now },
      ]);
      await tx.update(wallets).set({ balanceMinor: sql`${wallets.balanceMinor} - ${b.amountMinor}` }).where(eq(wallets.id, from.id));
      await tx.update(wallets).set({ balanceMinor: sql`${wallets.balanceMinor} + ${b.amountMinor}` }).where(eq(wallets.id, to.id));
      return true;
    });
    if (!ok) return reply.code(400).send({ error: "Unknown wallet" });
    return reply.code(201).send({ ok: true });
  });
}
