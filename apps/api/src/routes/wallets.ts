import { wallets } from "@okes/db";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";

const createBody = z.object({
  provider: z.enum(["mtn_momo", "telecel_cash", "airteltigo_money", "bank"]),
  label: z.string().min(1).max(120),
  maskedNumber: z.string().min(1).max(40),
  balanceMinor: amountMinorField.default(0),
  currency: currencyField,
  syncSource: z.enum(["sms", "aggregator", "manual"]).default("manual"),
});
const updateBody = createBody.partial();

export async function walletRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/wallets", auth, async (req) => {
    const rows = await db
      .select()
      .from(wallets)
      .where(eq(wallets.userId, req.user.sub))
      .orderBy(desc(wallets.createdAt));
    const totalMinor = rows.reduce((sum, w) => sum + w.balanceMinor, 0);
    return { wallets: rows, totalMinor };
  });

  app.post("/wallets", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(wallets)
      .values({ ...body, userId: req.user.sub })
      .returning();
    return reply.code(201).send({ wallet: row });
  });

  app.get<{ Params: { id: string } }>("/wallets/:id", auth, async (req, reply) => {
    const [row] = await db
      .select()
      .from(wallets)
      .where(and(eq(wallets.id, req.params.id), eq(wallets.userId, req.user.sub)));
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { wallet: row };
  });

  app.patch<{ Params: { id: string } }>("/wallets/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(wallets)
      .set(body)
      .where(and(eq(wallets.id, req.params.id), eq(wallets.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { wallet: row };
  });

  app.delete<{ Params: { id: string } }>("/wallets/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(wallets)
      .where(and(eq(wallets.id, req.params.id), eq(wallets.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
