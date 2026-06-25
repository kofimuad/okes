import { formatMoney, money } from "@okes/core";
import { caps, categories, goals, transactions, users, wallets } from "@okes/db";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db";
import { chatComplete, type CoachMessage } from "../lib/coach";
import { parseOr400, periodStart, startOfMonth } from "../lib/http";

const body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(30),
});

const ghs = (minor: number) => formatMoney(money(minor));

async function buildSnapshot(userId: string): Promise<string> {
  const ws = await db.select().from(wallets).where(eq(wallets.userId, userId));
  const balance = ws.reduce((s, w) => s + w.balanceMinor, 0);

  const monthStart = startOfMonth();
  const [inSum] = await db
    .select({ v: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.direction, "in"), eq(transactions.paid, true), gte(transactions.occurredAt, monthStart)));
  const [outSum] = await db
    .select({ v: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.direction, "out"), eq(transactions.paid, true), gte(transactions.occurredAt, monthStart)));

  const cats = await db.select().from(categories).where(sql`${categories.userId} = ${userId} or ${categories.userId} is null`);
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "Uncategorized";

  // top spend categories this month
  const spendByCat = await db
    .select({ categoryId: transactions.categoryId, v: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.direction, "out"), eq(transactions.paid, true), gte(transactions.occurredAt, monthStart)))
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`coalesce(sum(${transactions.amountMinor}),0)`))
    .limit(5);

  const capRows = await db.select().from(caps).where(eq(caps.userId, userId));
  const capLines: string[] = [];
  for (const c of capRows) {
    const [r] = await db
      .select({ v: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, c.categoryId), eq(transactions.direction, "out"), eq(transactions.paid, true), gte(transactions.occurredAt, periodStart(c.period))));
    const spent = Number(r?.v ?? 0);
    const pct = c.limitMinor > 0 ? Math.round((spent / c.limitMinor) * 100) : 0;
    capLines.push(`- ${catName(c.categoryId)}: ${ghs(spent)} of ${ghs(c.limitMinor)} per ${c.period} (${pct}%)`);
  }

  const gs = await db.select().from(goals).where(eq(goals.userId, userId));
  const goalLines = gs.map((g) => `- ${g.name}: ${ghs(g.savedMinor)} saved of ${ghs(g.targetMinor)}${g.deadline ? ` by ${g.deadline}` : ""}`);

  const recent = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(transactions.paid, true)))
    .orderBy(desc(transactions.occurredAt))
    .limit(8);
  const recentLines = recent.map((t) => `- ${t.direction === "in" ? "+" : "-"}${ghs(t.amountMinor)} ${t.party} (${catName(t.categoryId)})`);

  return [
    `Total balance across wallets: ${ghs(balance)}`,
    `This month — income: ${ghs(Number(inSum?.v ?? 0))}, spending: ${ghs(Number(outSum?.v ?? 0))}`,
    spendByCat.length ? `Top spending categories this month:\n${spendByCat.map((s) => `- ${catName(s.categoryId)}: ${ghs(Number(s.v))}`).join("\n")}` : "No spending yet this month.",
    capRows.length ? `Spending caps:\n${capLines.join("\n")}` : "No spending caps set.",
    gs.length ? `Savings goals:\n${goalLines.join("\n")}` : "No savings goals yet.",
    recent.length ? `Recent transactions:\n${recentLines.join("\n")}` : "No transactions yet.",
    `Existing category names (for caps): ${cats.map((c) => c.name).join(", ") || "none"}`,
  ].join("\n\n");
}

const SYSTEM = (name: string, snapshot: string) => `You are NOVA, the AI money companion inside Okes — a gamified personal-finance app for Ghana. Currency is the Ghanaian Cedi (GHS / ₵). The user is ${name}.

Be warm, encouraging and concise (2-5 short sentences unless asked for a plan). Use the user's REAL numbers below — never invent figures. Give specific, practical advice for a Ghanaian context (mobile money, etc.). If asked for a savings plan, give clear steps with amounts and timeframes.

When — and only when — the user clearly wants to create a savings goal or a spending cap, propose it by appending ONE action block on its own lines at the very end of your reply:
\`\`\`okes-action
{"type":"create_goal","name":"MacBook","targetMinor":900000,"deadline":"2026-12-01"}
\`\`\`
or
\`\`\`okes-action
{"type":"create_cap","category":"<one of the existing category names>","limitMinor":100000,"period":"monthly"}
\`\`\`
Rules for action blocks: amounts are in pesewas (cedis × 100); "period" is daily|weekly|monthly; "deadline" may be null; for caps the "category" MUST be one of the existing category names listed. Keep your spoken reply short — the app shows a Confirm button, so don't claim it's already done.

USER'S CURRENT FINANCES:
${snapshot}`;

export async function coachRoutes(app: FastifyInstance) {
  app.post("/coach/chat", { preHandler: [app.authenticate] }, async (req, reply) => {
    const b = parseOr400(reply, body, req.body);
    if (!b) return;
    try {
      const [u] = await db.select().from(users).where(eq(users.id, req.user.sub)).limit(1);
      const snapshot = await buildSnapshot(req.user.sub);
      const replyText = await chatComplete(SYSTEM(u?.name ?? "there", snapshot), b.messages as CoachMessage[]);
      return { reply: replyText };
    } catch (e) {
      return reply.code(502).send({ error: e instanceof Error ? e.message : "NOVA is unavailable right now." });
    }
  });
}
