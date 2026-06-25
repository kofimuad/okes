import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
  // NOVA AI coach. provider: "anthropic" (default) or "openai" (xAI Grok, OpenRouter, etc.)
  COACH_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
  COACH_MODEL: z.string().default("claude-sonnet-4-6"),
  COACH_API_KEY: z.string().optional(),
  COACH_BASE_URL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
