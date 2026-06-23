import { approvals } from "@okes/db";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { formatMoney, money } from "@okes/core";
import { db } from "../db";
import { amountMinorField, currencyField, parseOr400 } from "../lib/http";
import { sendPush } from "../lib/push";

const createBody = z.object({
  amountMinor: amountMinorField,
  currency: currencyField,
  reason: z.string().min(1).max(200),
  guardianCrewId: z.uuid().optional(),
});
const decisionBody = z.object({ status: z.enum(["approved", "declined"]) });

export async function approvalRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/approvals", auth, async (req) => {
    const rows = await db
      .select()
      .from(approvals)
      .where(eq(approvals.userId, req.user.sub))
      .orderBy(desc(approvals.createdAt));
    return { approvals: rows };
  });

  app.post("/approvals", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(approvals)
      .values({ ...body, userId: req.user.sub })
      .returning();
    void sendPush(req.user.sub, "approvals", {
      title: "Approval requested",
      body: `${formatMoney(money(body.amountMinor))} · ${body.reason}`,
      data: { route: "/crew" },
    });
    return reply.code(201).send({ approval: row });
  });

  app.patch<{ Params: { id: string } }>("/approvals/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, decisionBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(approvals)
      .set({ status: body.status })
      .where(and(eq(approvals.id, req.params.id), eq(approvals.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    void sendPush(req.user.sub, "approvals", {
      title: `Spend ${body.status}`,
      body: `${formatMoney(money(row.amountMinor))} · ${row.reason}`,
      data: { route: "/crew" },
    });
    return { approval: row };
  });
}
