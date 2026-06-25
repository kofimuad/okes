import { caps, crew, crewInvites, transactions, users, wallets } from "@okes/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { parseOr400, startOfMonth } from "../lib/http";
import { sendPush } from "../lib/push";

const roleEnum = z.enum(["watcher", "accountability", "guardian"]);
const createBody = z.object({
  name: z.string().min(1).max(120),
  initial: z.string().min(1).max(4),
  role: roleEnum.default("watcher"),
  friendUserId: z.uuid().optional(),
});
const updateBody = z.object({ role: roleEnum, online: z.boolean() }).partial();
const inviteBody = z.object({ email: z.email().transform((e) => e.toLowerCase()), role: roleEnum.default("watcher") });

async function capCounts(ownerId: string) {
  const rows = await db.select().from(caps).where(eq(caps.userId, ownerId));
  if (rows.length === 0) return { near: 0, over: 0 };
  const sums = await db
    .select({ categoryId: transactions.categoryId, spent: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, ownerId), eq(transactions.direction, "out"), gte(transactions.occurredAt, startOfMonth())))
    .groupBy(transactions.categoryId);
  const byCat = new Map(sums.map((s) => [s.categoryId, Number(s.spent)]));
  let near = 0, over = 0;
  for (const c of rows) {
    const spent = byCat.get(c.categoryId) ?? 0;
    if (c.limitMinor > 0 && spent >= c.limitMinor) over++;
    else if (c.limitMinor > 0 && spent >= c.limitMinor * 0.8) near++;
  }
  return { near, over };
}

export async function crewRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/crew", auth, async (req) => {
    const rows = await db.select().from(crew).where(eq(crew.ownerId, req.user.sub)).orderBy(desc(crew.createdAt));
    return { crew: rows };
  });

  app.post("/crew", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db.insert(crew).values({ ...body, ownerId: req.user.sub }).returning();
    return reply.code(201).send({ member: row });
  });

  app.patch<{ Params: { id: string } }>("/crew/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db.update(crew).set(body).where(and(eq(crew.id, req.params.id), eq(crew.ownerId, req.user.sub))).returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { member: row };
  });

  app.delete<{ Params: { id: string } }>("/crew/:id", auth, async (req, reply) => {
    const [row] = await db.delete(crew).where(and(eq(crew.id, req.params.id), eq(crew.ownerId, req.user.sub))).returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });

  // --- invitations -----------------------------------------------------------
  app.post("/crew/invites", auth, async (req, reply) => {
    const body = parseOr400(reply, inviteBody, req.body);
    if (!body) return;
    const [me] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!me) return reply.code(404).send({ error: "User not found" });
    if (me.email === body.email) return reply.code(400).send({ error: "You can't invite yourself" });

    const [invite] = await db
      .insert(crewInvites)
      .values({ inviterId: req.user.sub, inviteeEmail: body.email, role: body.role })
      .returning();

    const [invitee] = await db.select().from(users).where(eq(users.email, body.email));
    if (invitee) {
      void sendPush(invitee.id, "crew", {
        title: "Crew invitation",
        body: `${me.name} invited you to their crew as ${body.role}`,
        data: { route: "/crew" },
      });
    }
    return reply.code(201).send({ invite, inviteeExists: Boolean(invitee) });
  });

  app.get("/crew/invites/incoming", auth, async (req) => {
    const [me] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!me) return { invites: [] };
    const rows = await db
      .select({ id: crewInvites.id, role: crewInvites.role, createdAt: crewInvites.createdAt, inviterName: users.name })
      .from(crewInvites)
      .innerJoin(users, eq(users.id, crewInvites.inviterId))
      .where(and(eq(crewInvites.inviteeEmail, me.email), eq(crewInvites.status, "pending")))
      .orderBy(desc(crewInvites.createdAt));
    return { invites: rows };
  });

  app.post<{ Params: { id: string } }>("/crew/invites/:id/accept", auth, async (req, reply) => {
    const [me] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!me) return reply.code(404).send({ error: "User not found" });
    const [invite] = await db
      .select()
      .from(crewInvites)
      .where(and(eq(crewInvites.id, req.params.id), eq(crewInvites.inviteeEmail, me.email), eq(crewInvites.status, "pending")));
    if (!invite) return reply.code(404).send({ error: "Invite not found" });

    await db.insert(crew).values({
      ownerId: invite.inviterId,
      friendUserId: me.id,
      name: me.name,
      initial: me.name.charAt(0).toUpperCase(),
      role: invite.role,
      online: true,
    });
    await db.update(crewInvites).set({ status: "accepted" }).where(eq(crewInvites.id, invite.id));
    void sendPush(invite.inviterId, "crew", {
      title: "Crew invite accepted",
      body: `${me.name} joined your crew`,
      data: { route: "/crew" },
    });
    return reply.code(201).send({ ok: true });
  });

  app.post<{ Params: { id: string } }>("/crew/invites/:id/decline", auth, async (req, reply) => {
    const [me] = await db.select().from(users).where(eq(users.id, req.user.sub));
    if (!me) return reply.code(404).send({ error: "User not found" });
    await db
      .update(crewInvites)
      .set({ status: "declined" })
      .where(and(eq(crewInvites.id, req.params.id), eq(crewInvites.inviteeEmail, me.email)));
    return { ok: true };
  });

  // --- people who added me (what I watch) ------------------------------------
  app.get("/crew/watching", auth, async (req) => {
    const memberships = await db
      .select({ ownerId: crew.ownerId, role: crew.role, name: users.name })
      .from(crew)
      .innerJoin(users, eq(users.id, crew.ownerId))
      .where(eq(crew.friendUserId, req.user.sub));

    const watching = [];
    for (const m of memberships) {
      const [bal] = await db
        .select({ total: sql<number>`coalesce(sum(${wallets.balanceMinor}),0)::int` })
        .from(wallets)
        .where(eq(wallets.userId, m.ownerId));
      const counts = await capCounts(m.ownerId);
      watching.push({
        ownerId: m.ownerId,
        name: m.name,
        role: m.role,
        balanceMinor: Number(bal?.total ?? 0),
        capsNear: counts.near,
        capsOver: counts.over,
      });
    }
    return { watching };
  });
}
