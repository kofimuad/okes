/**
 * Parser for Ghanaian mobile-money / bank SMS alerts → structured transactions.
 * Pure TS so it's unit-testable and shared. Heuristic + regex based; refine with
 * real samples over time. Returns null when a message isn't a recognised txn.
 */

export type SmsProvider = "mtn_momo" | "telecel_cash" | "airteltigo_money" | "bank";

export interface ParsedSms {
  provider: SmsProvider;
  direction: "in" | "out";
  amountMinor: number;
  party: string;
  balanceMinor?: number;
  /** Provider transaction id if present (used to dedupe). */
  ref?: string;
}

const PROVIDER_LABEL: Record<SmsProvider, string> = {
  mtn_momo: "MTN MoMo",
  telecel_cash: "Telecel Cash",
  airteltigo_money: "AirtelTigo Money",
  bank: "Bank",
};

export const providerLabel = (p: SmsProvider): string => PROVIDER_LABEL[p];

function detectProvider(sender: string, body: string): SmsProvider | null {
  const s = `${sender} ${body}`.toLowerCase();
  if (/\bmtn\b|momo|mobile money/.test(s) && !/airteltigo|telecel/.test(sender.toLowerCase())) return "mtn_momo";
  if (/telecel|vodafone|\bv-?cash\b/.test(s)) return "telecel_cash";
  if (/airteltigo|airtel|\btigo\b/.test(s)) return "airteltigo_money";
  if (/\bbank\b|gcb|ecobank|stanbic|absa|fidelity|cal ?bank|access bank|zenith|account/.test(s)) return "bank";
  if (/\bmtn\b|momo/.test(s)) return "mtn_momo";
  return null;
}

function detectDirection(body: string): "in" | "out" | null {
  const b = body.toLowerCase();
  if (/received|credited|\bcredit\b|deposit|you have received|has received/.test(b)) return "in";
  if (/sent|paid|payment|debited|\bdebit\b|withdraw|cash ?out|transfer(red)? to|made to|purchase|spent/.test(b))
    return "out";
  return null;
}

function toMinor(s: string): number {
  return Math.round(parseFloat(s.replace(/,/g, "")) * 100);
}

/** First GHS amount in the message (the txn amount usually precedes the balance). */
function extractAmount(body: string): number | null {
  const m = body.match(/(?:GHS|GH₵|₵|GH₵|cedis)\s*([\d,]+(?:\.\d{1,2})?)/i) ?? body.match(/([\d,]+\.\d{2})\s*(?:ghs|cedis)/i);
  return m ? toMinor(m[1]!) : null;
}

function extractBalance(body: string): number | undefined {
  const m = body.match(/balance[:\s]*(?:is\s*)?(?:GHS|GH₵|₵)?\s*([\d,]+\.\d{2})/i);
  return m ? toMinor(m[1]!) : undefined;
}

const PARTY_STOP =
  "(?:[.,]|\\s+(?:for|current|new|available|avail|balance|bal|transaction|trans|txn|ref|reference|on|at|fee|id|successful|completed|wallet)\\b|\\s+GH|\\s+\\d|$)";

function extractParty(body: string, direction: "in" | "out"): string | undefined {
  const preps = direction === "in" ? ["from"] : ["to", "for"];
  for (const kw of preps) {
    const m = body.match(new RegExp(`\\b${kw}\\s+([A-Za-z .'\\-/&]+?)${PARTY_STOP}`, "i"));
    const name = m?.[1]?.trim();
    if (name && name.length > 1 && name.length <= 60) return name;
  }
  return undefined;
}

function extractRef(body: string): string | undefined {
  const m =
    body.match(/(?:financial transaction id|transaction id|txn id|trans\.? id)[:\s.]*([A-Za-z0-9.\-]{4,})/i) ??
    body.match(/(?:reference|ref(?:\s*no)?)[:\s.]*([A-Za-z0-9.\-]{2,})/i);
  return m?.[1]?.replace(/[.,;:]+$/, "") || undefined;
}

export function parseSms(sender: string, body: string): ParsedSms | null {
  const provider = detectProvider(sender, body);
  if (!provider) return null;
  const amountMinor = extractAmount(body);
  if (amountMinor == null || amountMinor <= 0) return null;
  const direction = detectDirection(body);
  if (!direction) return null;
  return {
    provider,
    direction,
    amountMinor,
    party: extractParty(body, direction) ?? providerLabel(provider),
    balanceMinor: extractBalance(body),
    ref: extractRef(body),
  };
}
