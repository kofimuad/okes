/**
 * @okes/core — shared domain model for the Okes apps.
 * Pure TypeScript (no React Native deps) so it can be reused by every app
 * and by future server / edge functions.
 */

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** ISO-4217 currency code. Okes defaults to Ghana Cedi. */
export type CurrencyCode = "GHS" | "USD" | "EUR" | "NGN";

/** Money is stored in minor units (pesewas for GHS) to avoid float errors. */
export interface Money {
  /** Amount in minor units, e.g. 1250 = GHS 12.50 */
  minor: number;
  currency: CurrencyCode;
}

export const money = (minor: number, currency: CurrencyCode = "GHS"): Money => ({
  minor,
  currency,
});

export function formatMoney(m: Money, opts: { withCode?: boolean } = {}): string {
  const major = (m.minor / 100).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return opts.withCode === false ? major : `${m.currency} ${major}`;
}

// ---------------------------------------------------------------------------
// Wallets & transactions
// ---------------------------------------------------------------------------

export type WalletProvider =
  | "mtn_momo"
  | "telecel_cash"
  | "airteltigo_money"
  | "bank";

/** How a wallet's data flows into Okes. */
export type SyncSource = "sms" | "aggregator" | "manual";

export interface Wallet {
  id: string;
  provider: WalletProvider;
  label: string;
  maskedNumber: string;
  balance: Money;
  syncSource: SyncSource;
  lastSyncedAt?: string;
}

export type TransactionDirection = "in" | "out";

export interface Transaction {
  id: string;
  walletId: string;
  direction: TransactionDirection;
  amount: Money;
  /** Counterparty / merchant name, e.g. "Bolt Food". */
  party: string;
  categoryId?: string;
  occurredAt: string;
  /** True when captured automatically (SMS / aggregator) rather than entered. */
  auto: boolean;
  /** Auto-captured items that still need a category/confirmation. */
  needsReview: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
}

// ---------------------------------------------------------------------------
// Income, caps & goals
// ---------------------------------------------------------------------------

export interface IncomeStream {
  id: string;
  label: string;
  expected: Money;
  recurring: boolean;
}

export type CapStatus = "on_track" | "near" | "over";

export interface SpendingCap {
  id: string;
  categoryId: string;
  limit: Money;
  spent: Money;
  /** Percentages at which to notify, e.g. [70, 90, 100]. */
  alertThresholds: number[];
  /** Block new spends at 100% (overridable by a Guardian). */
  lockAtLimit: boolean;
  notifyCrew: boolean;
}

export interface SavingsGoal {
  id: string;
  name: string;
  icon: string;
  target: Money;
  saved: Money;
  deadline?: string;
  /** Crew member ids co-saving toward this goal. */
  sharedWith: string[];
}

// ---------------------------------------------------------------------------
// Crew (social)
// ---------------------------------------------------------------------------

/** Per-friend trust level. Each is strictly more powerful than the last. */
export type CrewRole = "watcher" | "accountability" | "guardian";

export interface CrewMember {
  id: string;
  name: string;
  initial: string;
  role: CrewRole;
  online: boolean;
}

export interface ApprovalRequest {
  id: string;
  amount: Money;
  reason: string;
  guardianId: string;
  status: "pending" | "approved" | "declined";
}

// ---------------------------------------------------------------------------
// Gamification
// ---------------------------------------------------------------------------

export const RANKS = [
  "Cadet",
  "Ensign",
  "Lieutenant",
  "Commander",
  "Captain",
  "Admiral",
] as const;
export type Rank = (typeof RANKS)[number];

export interface PlayerProfile {
  name: string;
  initial: string;
  rank: Rank;
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
}

// ---------------------------------------------------------------------------
// Backend client config
// ---------------------------------------------------------------------------

/**
 * Config for talking to the Okes API (custom Node/TS service backed by
 * self-hosted Postgres; deployed on Railway). No Supabase.
 */
export interface OkesConfig {
  /** Base URL of the Okes API, e.g. http://localhost:8080 or the Railway URL. */
  apiBaseUrl: string;
}

/** Auth token pair returned by the API's login/refresh endpoints. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export { createApiClient, ApiError } from "./api";
export type {
  ApiClient,
  ApprovalDto,
  AuthResult,
  CapDto,
  CategoryDto,
  CrewDto,
  GoalDto,
  ImportTxItem,
  NewCrewInput,
  NewGoalInput,
  NewTransactionInput,
  NewWalletInput,
  ProfileDto,
  PublicUser,
  SummaryDto,
  TransactionDto,
  WalletDto,
} from "./api";

export { parseSms, providerLabel } from "./sms";
export type { ParsedSms, SmsProvider } from "./sms";
