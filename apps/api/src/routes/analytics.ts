import { wallets } from "@okes/db";
import { eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { db } from "../db";

type Slice = { name: string; amountMinor: number };

export async function analyticsRoutes(app: FastifyInstance) {
  const auth = { preHandler: [app.authenticate] };

  app.get("/analytics", auth, async (req) => {
    const q = req.query as { months?: string };
    const months = Math.min(Math.max(parseInt(q.months ?? "6", 10) || 6, 1), 60);
    const start = new Date();
    start.setMonth(start.getMonth() - (months - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const uid = req.user.sub;

    const [bal] = await db
      .select({ total: sql<number>`coalesce(sum(${wallets.balanceMinor}),0)::int` })
      .from(wallets)
      .where(eq(wallets.userId, uid));

    const catRes = await db.execute(sql`
      select t.direction as direction, coalesce(c.name, 'Uncategorized') as name, sum(t.amount_minor)::int as amt
      from transactions t
      left join categories c on c.id = t.category_id
      where t.user_id = ${uid} and t.occurred_at >= ${start.toISOString()}
      group by t.direction, name
      order by amt desc
    `);
    const monRes = await db.execute(sql`
      select to_char(date_trunc('month', t.occurred_at), 'YYYY-MM') as ym, t.direction as direction, sum(t.amount_minor)::int as amt
      from transactions t
      where t.user_id = ${uid} and t.occurred_at >= ${start.toISOString()}
      group by ym, t.direction
    `);

    const catRows = catRes.rows as { direction: "in" | "out"; name: string; amt: number }[];
    const monRows = monRes.rows as { ym: string; direction: "in" | "out"; amt: number }[];

    const income: Slice[] = [];
    const expense: Slice[] = [];
    let incomeTotal = 0;
    let expenseTotal = 0;
    for (const r of catRows) {
      const amt = Number(r.amt);
      if (r.direction === "in") { income.push({ name: r.name, amountMinor: amt }); incomeTotal += amt; }
      else { expense.push({ name: r.name, amountMinor: amt }); expenseTotal += amt; }
    }

    // Fill every month in range so the series is continuous.
    const monthMap = new Map<string, { income: number; spend: number }>();
    for (let i = 0; i < months; i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      monthMap.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, { income: 0, spend: 0 });
    }
    for (const r of monRows) {
      const bucket = monthMap.get(r.ym);
      if (!bucket) continue;
      if (r.direction === "in") bucket.income += Number(r.amt);
      else bucket.spend += Number(r.amt);
    }
    const series = [...monthMap.entries()].map(([label, v]) => ({ label, income: v.income, spend: v.spend }));

    return {
      balanceMinor: Number(bal?.total ?? 0),
      income: { totalMinor: incomeTotal, byCategory: income },
      expense: { totalMinor: expenseTotal, byCategory: expense },
      series,
    };
  });
}
