import type { FastifyReply } from "fastify";
import { z } from "zod";

/** Parse `data` with `schema`; on failure send 400 and return null. */
export function parseOr400<T>(
  reply: FastifyReply,
  schema: z.ZodType<T>,
  data: unknown,
): T | null {
  const r = schema.safeParse(data);
  if (!r.success) {
    reply.code(400).send({ error: z.treeifyError(r.error) });
    return null;
  }
  return r.data;
}

// Shared field schemas (money is stored in minor units / pesewas).
export const amountMinorField = z.number().int().nonnegative();
export const currencyField = z.string().length(3).default("GHS");

export function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Start of the current period window for a budget. Week starts Monday. */
export function periodStart(period: string, d = new Date()): Date {
  if (period === "daily") return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (period === "weekly") {
    const day = (d.getDay() + 6) % 7; // Mon=0
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
    return start;
  }
  return startOfMonth(d);
}
