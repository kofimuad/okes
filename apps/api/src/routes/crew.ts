import { crew } from "@okes/db";
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { parseOr400 } from "../lib/http";

const roleEnum = z.enum(["watcher", "accountability", "guardian"]);
const createBody = z.object({
  name: z.string().min(1).max(120),
  initial: z.string().min(1).max(4),
  role: roleEnum.default("watcher"),
  friendUserId: z.uuid().optional(),
});
const updateBody = z.object({ role: roleEnum, online: z.boolean() }).partial();

export async function crewRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/crew", auth, async (req) => {
    const rows = await db
      .select()
      .from(crew)
      .where(eq(crew.ownerId, req.user.sub))
      .orderBy(desc(crew.createdAt));
    return { crew: rows };
  });

  app.post("/crew", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(crew)
      .values({ ...body, ownerId: req.user.sub })
      .returning();
    return reply.code(201).send({ member: row });
  });

  app.patch<{ Params: { id: string } }>("/crew/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(crew)
      .set(body)
      .where(and(eq(crew.id, req.params.id), eq(crew.ownerId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { member: row };
  });

  app.delete<{ Params: { id: string } }>("/crew/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(crew)
      .where(and(eq(crew.id, req.params.id), eq(crew.ownerId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
