import { env } from "../env";

export type CoachMessage = { role: "user" | "assistant"; content: string };

const MAX_TOKENS = 1024;

/** Provider-agnostic chat completion. Default: Anthropic (Claude). Optional: any
 *  OpenAI-compatible endpoint (xAI Grok, OpenRouter free models, etc.) via env. */
export async function chatComplete(system: string, messages: CoachMessage[]): Promise<string> {
  if (env.COACH_PROVIDER === "anthropic") {
    const key = env.COACH_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("NOVA isn't set up yet — add an API key on the server.");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: env.COACH_MODEL, max_tokens: MAX_TOKENS, system, messages }),
    });
    if (!res.ok) throw new Error(`AI provider error ${res.status}: ${(await res.text()).slice(0, 240)}`);
    const data = (await res.json()) as { content?: { text?: string }[] };
    return (data.content?.[0]?.text ?? "").trim();
  }

  // OpenAI-compatible (Grok / OpenRouter / OpenAI / …)
  const key = env.COACH_API_KEY;
  if (!key) throw new Error("NOVA isn't set up yet — add an API key on the server.");
  const base = env.COACH_BASE_URL || "https://openrouter.ai/api/v1";
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: env.COACH_MODEL, max_tokens: MAX_TOKENS, messages: [{ role: "system", content: system }, ...messages] }),
  });
  if (!res.ok) throw new Error(`AI provider error ${res.status}: ${(await res.text()).slice(0, 240)}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
