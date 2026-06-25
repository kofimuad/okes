import { formatMoney, money } from "@okes/core";
import { caps, categories, deviceTokens, transactions, users } from "@okes/db";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import { periodStart } from "./http";

type PushKind = "caps" | "approvals" | "summary" | "crew";
type Payload = { title: string; body: string; data?: Record<string, unknown> };

/** Best-effort push via Expo's push service. Respects the user's notification prefs. */
export async function sendPush(userId: string, kind: PushKind, payload: Payload): Promise<void> {
  const [u] = await db.select().from(users).where(eq(users.id, userId));
  if (!u || !u.notifyPush) return;
  if (kind === "caps" && !u.notifyCaps) return;
  if (kind === "summary" && !u.notifySummary) return;
  if (kind === "crew" && !u.notifyCrew) return;

  const tokens = await db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
  if (tokens.length === 0) return;

  const messages = tokens.map((t) => ({
    to: t.token,
    sound: "default",
    title: payload.title,
    body: payload.body,
    data: payload.data ?? {},
  }));
  try {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(messages),
    });
  } catch {
    // best-effort; never fail the originating request
  }
}

/** Notify only when a spend pushes a category cap across the 80% or 100% line. */
export async function notifyCapCrossing(userId: string, categoryId: string | null, addedAmountMinor: number): Promise<void> {
  if (!categoryId || addedAmountMinor <= 0) return;
  const [cap] = await db.select().from(caps).where(and(eq(caps.userId, userId), eq(caps.categoryId, categoryId)));
  if (!cap || cap.limitMinor <= 0) return;

  const [row] = await db
    .select({ spent: sql<number>`coalesce(sum(${transactions.amountMinor}),0)::int` })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.categoryId, categoryId),
        eq(transactions.direction, "out"),
        eq(transactions.paid, true),
        gte(transactions.occurredAt, periodStart(cap.period)),
      ),
    );
  const now = Number(row?.spent ?? 0);
  const prev = now - addedAmountMinor;
  const limit = cap.limitMinor;
  const [cat] = await db.select().from(categories).where(eq(categories.id, categoryId));
  const name = cat?.name ?? "A category";

  if (prev < limit && now >= limit) {
    await sendPush(userId, "caps", {
      title: `${name} over budget`,
      body: `You've spent ${formatMoney(money(now))} of your ${formatMoney(money(limit))} cap.`,
      data: { route: "/caps" },
    });
  } else if (prev < limit * 0.8 && now >= limit * 0.8) {
    await sendPush(userId, "caps", {
      title: `${name} nearing its cap`,
      body: `Only ${formatMoney(money(Math.max(limit - now, 0)))} left this month.`,
      data: { route: "/caps" },
    });
  }
}
