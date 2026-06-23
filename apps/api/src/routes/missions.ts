import { applyXp, MISSIONS, RANKS, xpToNext } from "@okes/core";
import { missionClaims, users } from "@okes/db";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db";

const rankForLevel = (level: number) =>
  RANKS[Math.min(Math.max(level - 1, 0), RANKS.length - 1)] ?? "Cadet";
const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

type UserRow = typeof users.$inferSelect;
const profileOf = (u: UserRow) => ({
  name: u.name,
  initial: u.name.charAt(0).toUpperCase(),
  rank: rankForLevel(u.level),
  level: u.level,
  xp: u.xp,
  xpToNext: xpToNext(u.level),
  streakDays: u.streakDays,
});
const missionList = (claimed: Set<string>) =>
  MISSIONS.map((m) => ({ ...m, claimed: claimed.has(m.key) }));

export async function missionRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  const claimedToday = async (userId: string) => {
    const rows = await db
      .select()
      .from(missionClaims)
      .where(and(eq(missionClaims.userId, userId), eq(missionClaims.claimedOn, today())));
    return new Set(rows.map((r) => r.missionKey));
  };

  app.get("/missions", auth, async (req) => {
    return { missions: missionList(await claimedToday(req.user.sub)) };
  });

  app.post("/missions/:key/claim", auth, async (req, reply) => {
    const { key } = req.params as { key: string };
    const def = MISSIONS.find((m) => m.key === key);
    if (!def) return reply.code(404).send({ error: "Unknown mission" });

    const result = await db.transaction(async (tx) => {
      const claimed = new Set(
        (
          await tx
            .select()
            .from(missionClaims)
            .where(and(eq(missionClaims.userId, req.user.sub), eq(missionClaims.claimedOn, today())))
        ).map((r) => r.missionKey),
      );
      if (claimed.has(key)) return { already: true as const };

      await tx.insert(missionClaims).values({ userId: req.user.sub, missionKey: key, claimedOn: today() });
      const [u] = await tx.select().from(users).where(eq(users.id, req.user.sub));
      if (!u) return { already: true as const };

      const streak = u.lastActiveOn === today() ? u.streakDays : u.lastActiveOn === yesterday() ? u.streakDays + 1 : 1;
      const leveled = applyXp(u.level, u.xp, def.xp);
      const [updated] = await tx
        .update(users)
        .set({ xp: leveled.xp, level: leveled.level, streakDays: streak, lastActiveOn: today() })
        .where(eq(users.id, u.id))
        .returning();
      claimed.add(key);
      return { already: false as const, user: updated!, claimed };
    });

    if (result.already) return reply.code(409).send({ error: "Already claimed today" });
    return { profile: profileOf(result.user), missions: missionList(result.claimed), awardedXp: def.xp };
  });
}
