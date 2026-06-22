import { users } from "@okes/db";
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { hashPassword, verifyPassword } from "../auth/password";

const credentials = z.object({
  email: z.email().transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
const registerBody = credentials.extend({ name: z.string().min(1).max(120) });
const refreshBody = z.object({ refreshToken: z.string().min(1) });

function issueTokens(app: FastifyInstance, userId: string) {
  return {
    accessToken: app.jwt.sign({ sub: userId, type: "access" }, { expiresIn: "15m" }),
    refreshToken: app.jwt.sign({ sub: userId, type: "refresh" }, { expiresIn: "30d" }),
  };
}

const publicUser = (u: { id: string; email: string; name: string }) => ({
  id: u.id,
  email: u.email,
  name: u.name,
});

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/register", async (req, reply) => {
    const parsed = registerBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: z.treeifyError(parsed.error) });
    const { email, password, name } = parsed.data;

    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) return reply.code(409).send({ error: "Email already registered" });

    const [user] = await db
      .insert(users)
      .values({ email, name, passwordHash: await hashPassword(password) })
      .returning();

    return reply.code(201).send({ user: publicUser(user!), ...issueTokens(app, user!.id) });
  });

  app.post("/auth/login", async (req, reply) => {
    const parsed = credentials.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: z.treeifyError(parsed.error) });
    const { email, password } = parsed.data;

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user || !(await verifyPassword(user.passwordHash, password)))
      return reply.code(401).send({ error: "Invalid email or password" });

    return reply.send({ user: publicUser(user), ...issueTokens(app, user.id) });
  });

  app.post("/auth/refresh", async (req, reply) => {
    const parsed = refreshBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: z.treeifyError(parsed.error) });
    try {
      const payload = app.jwt.verify<{ sub: string; type: string }>(parsed.data.refreshToken);
      if (payload.type !== "refresh") return reply.code(401).send({ error: "Invalid token type" });
      return reply.send(issueTokens(app, payload.sub));
    } catch {
      return reply.code(401).send({ error: "Invalid or expired refresh token" });
    }
  });

  app.get("/auth/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const [user] = await db.select().from(users).where(eq(users.id, req.user.sub)).limit(1);
    if (!user) return reply.code(404).send({ error: "User not found" });
    return reply.send({ user: publicUser(user) });
  });
}
