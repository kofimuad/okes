import { formatMoney, money } from "@okes/core";
import { approvals, crew, users } from "@okes/db";
import { and, desc, eq, isNotNull } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
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
    const rows = await db.select().from(approvals).where(eq(approvals.userId, req.user.sub)).orderBy(desc(approvals.createdAt));
    return { approvals: rows };
  });

  app.post("/approvals", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;

    // Route to a linked guardian, if the requester has one.
    const [guardian] = await db
      .select()
      .from(crew)
      .where(and(eq(crew.ownerId, req.user.sub), eq(crew.role, "guardian"), isNotNull(crew.friendUserId)));
    const guardianUserId = guardian?.friendUserId ?? null;

    const [row] = await db
      .insert(approvals)
      .values({ ...body, userId: req.user.sub, guardianUserId })
      .returning();

    const [me] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (guardianUserId) {
      void sendPush(guardianUserId, "crew", {
        title: "Approval needed",
        body: `${me?.name ?? "Someone"} wants to spend ${formatMoney(money(body.amountMinor))} · ${body.reason}`,
        data: { route: "/crew" },
      });
    }
    return reply.code(201).send({ approval: row });
  });

  // Requests routed to me as a guardian.
  app.get("/approvals/incoming", auth, async (req) => {
    const rows = await db
      .select({
        id: approvals.id,
        amountMinor: approvals.amountMinor,
        currency: approvals.currency,
        reason: approvals.reason,
        status: approvals.status,
        createdAt: approvals.createdAt,
        requesterName: users.name,
      })
      .from(approvals)
      .innerJoin(users, eq(users.id, approvals.userId))
      .where(and(eq(approvals.guardianUserId, req.user.sub), eq(approvals.status, "pending")))
      .orderBy(desc(approvals.createdAt));
    return { approvals: rows };
  });

  // Guardian decides on an incoming request.
  app.post<{ Params: { id: string } }>("/approvals/:id/decide", auth, async (req, reply) => {
    const body = parseOr400(reply, decisionBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(approvals)
      .set({ status: body.status })
      .where(and(eq(approvals.id, req.params.id), eq(approvals.guardianUserId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    void sendPush(row.userId, "crew", {
      title: `Spend ${body.status}`,
      body: `${formatMoney(money(row.amountMinor))} · ${row.reason}`,
      data: { route: "/crew" },
    });
    return { approval: row };
  });

  // Owner self-decides (legacy / when no guardian is linked).
  app.patch<{ Params: { id: string } }>("/approvals/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, decisionBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(approvals)
      .set({ status: body.status })
      .where(and(eq(approvals.id, req.params.id), eq(approvals.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { approval: row };
  });
}
