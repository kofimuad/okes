import { categories } from "@okes/db";
import { and, eq, isNull, or } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { parseOr400 } from "../lib/http";

const createBody = z.object({
  name: z.string().min(1).max(80),
  icon: z.string().min(1).max(60),
  color: z.string().max(16).optional(),
  parentId: z.uuid().nullable().optional(),
});
const updateBody = createBody.partial();

export async function categoryRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/categories", auth, async (req) => {
    const rows = await db
      .select()
      .from(categories)
      .where(or(eq(categories.userId, req.user.sub), isNull(categories.userId)));
    return { categories: rows };
  });

  app.post("/categories", auth, async (req, reply) => {
    const body = parseOr400(reply, createBody, req.body);
    if (!body) return;
    const [row] = await db
      .insert(categories)
      .values({ ...body, userId: req.user.sub })
      .returning();
    return reply.code(201).send({ category: row });
  });

  app.patch<{ Params: { id: string } }>("/categories/:id", auth, async (req, reply) => {
    const body = parseOr400(reply, updateBody, req.body);
    if (!body) return;
    const [row] = await db
      .update(categories)
      .set(body)
      .where(and(eq(categories.id, req.params.id), eq(categories.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { category: row };
  });

  app.delete<{ Params: { id: string } }>("/categories/:id", auth, async (req, reply) => {
    const [row] = await db
      .delete(categories)
      .where(and(eq(categories.id, req.params.id), eq(categories.userId, req.user.sub)))
      .returning();
    if (!row) return reply.code(404).send({ error: "Not found" });
    return { ok: true };
  });
}
