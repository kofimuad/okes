import { goals, transactions, wallets } from "@okes/db";
import { and, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db";
import { startOfMonth } from "../lib/http";

/** Dashboard rollup for the Command Center. */
export async function summaryRoutes(app: FastifyInstance) {
  app.get("/summary", { preHandler: [app.authenticate] }, async (req) => {
    const userId = req.user.sub;

    const [walletAgg] = await db
      .select({
        totalMinor: sql<number>`coalesce(sum(${wallets.balanceMinor}), 0)::int`,
        count: sql<number>`count(*)::int`,
      })
      .from(wallets)
      .where(eq(wallets.userId, userId));

    const monthRows = await db
      .select({
        direction: transactions.direction,
        total: sql<number>`coalesce(sum(${transactions.amountMinor}), 0)::int`,
      })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.occurredAt, startOfMonth())))
      .groupBy(transactions.direction);

    const [goalAgg] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(goals)
      .where(eq(goals.userId, userId));

    const incomeMinor = Number(monthRows.find((r) => r.direction === "in")?.total ?? 0);
    const spendMinor = Number(monthRows.find((r) => r.direction === "out")?.total ?? 0);

    return {
      balanceMinor: Number(walletAgg?.totalMinor ?? 0),
      walletCount: Number(walletAgg?.count ?? 0),
      goalCount: Number(goalAgg?.count ?? 0),
      month: { incomeMinor, spendMinor, netMinor: incomeMinor - spendMinor },
    };
  });
}
