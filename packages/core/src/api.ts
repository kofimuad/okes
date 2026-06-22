/**
 * Typed client for the Okes API. Framework-agnostic (uses global fetch), so
 * it works in React Native, web, and Node. The budget app wraps this with
 * token persistence + React Query.
 */

export interface PublicUser {
  id: string;
  email: string;
  name: string;
}
export interface AuthResult {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
export interface SummaryDto {
  balanceMinor: number;
  walletCount: number;
  goalCount: number;
  month: { incomeMinor: number; spendMinor: number; netMinor: number };
}
export interface WalletDto {
  id: string;
  provider: "mtn_momo" | "telecel_cash" | "airteltigo_money" | "bank";
  label: string;
  maskedNumber: string;
  balanceMinor: number;
  currency: string;
  syncSource: "sms" | "aggregator" | "manual";
  lastSyncedAt: string | null;
}
export interface TransactionDto {
  id: string;
  walletId: string;
  direction: "in" | "out";
  amountMinor: number;
  currency: string;
  party: string;
  categoryId: string | null;
  occurredAt: string;
  auto: boolean;
  needsReview: boolean;
}

export interface GoalDto {
  id: string;
  name: string;
  icon: string;
  targetMinor: number;
  savedMinor: number;
  currency: string;
  deadline: string | null;
}
export interface CrewDto {
  id: string;
  name: string;
  initial: string;
  role: "watcher" | "accountability" | "guardian";
  online: boolean;
}
export interface ApprovalDto {
  id: string;
  amountMinor: number;
  currency: string;
  reason: string;
  status: "pending" | "approved" | "declined";
  guardianCrewId: string | null;
}
export interface CategoryDto {
  id: string;
  name: string;
  icon: string;
}
export interface CapDto {
  id: string;
  categoryId: string;
  limitMinor: number;
  spentMinor: number;
  status: "on_track" | "near" | "over";
  currency: string;
}
export interface ProfileDto {
  name: string;
  initial: string;
  rank: string;
  level: number;
  xp: number;
  xpToNext: number;
  streakDays: number;
}

export interface NewWalletInput {
  provider: WalletDto["provider"];
  label: string;
  maskedNumber: string;
  balanceMinor?: number;
  currency?: string;
  syncSource?: WalletDto["syncSource"];
}
export interface NewTransactionInput {
  walletId: string;
  direction: "in" | "out";
  amountMinor: number;
  party: string;
  categoryId?: string;
  currency?: string;
  auto?: boolean;
  needsReview?: boolean;
  occurredAt?: string;
}
export interface NewGoalInput {
  name: string;
  icon: string;
  targetMinor: number;
  savedMinor?: number;
  currency?: string;
  deadline?: string;
}
export interface ImportTxItem {
  externalRef: string;
  walletId: string;
  direction: "in" | "out";
  amountMinor: number;
  currency?: string;
  party: string;
  occurredAt?: string;
}

export interface NewCrewInput {
  name: string;
  initial: string;
  role: CrewDto["role"];
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClient {
  setTokens(accessToken: string | null, refreshToken?: string | null): void;
  getRefreshToken(): string | null;
  register(email: string, password: string, name: string): Promise<AuthResult>;
  login(email: string, password: string): Promise<AuthResult>;
  refresh(): Promise<{ accessToken: string; refreshToken: string }>;
  me(): Promise<{ user: PublicUser }>;
  summary(): Promise<SummaryDto>;
  listWallets(): Promise<{ wallets: WalletDto[]; totalMinor: number }>;
  listTransactions(params?: {
    limit?: number;
    needsReview?: boolean;
  }): Promise<{ transactions: TransactionDto[] }>;
  listGoals(): Promise<{ goals: GoalDto[] }>;
  listCaps(): Promise<{ caps: CapDto[] }>;
  listCategories(): Promise<{ categories: CategoryDto[] }>;
  listCrew(): Promise<{ crew: CrewDto[] }>;
  listApprovals(): Promise<{ approvals: ApprovalDto[] }>;
  getProfile(): Promise<{ profile: ProfileDto }>;
  // writes
  createWallet(input: NewWalletInput): Promise<{ wallet: WalletDto }>;
  createTransaction(input: NewTransactionInput): Promise<{ transaction: TransactionDto }>;
  updateTransaction(
    id: string,
    patch: Partial<{ categoryId: string | null; needsReview: boolean; party: string }>,
  ): Promise<{ transaction: TransactionDto }>;
  createGoal(input: NewGoalInput): Promise<{ goal: GoalDto }>;
  contributeGoal(id: string, amountMinor: number): Promise<{ goal: GoalDto }>;
  importTransactions(items: ImportTxItem[]): Promise<{ imported: number; skipped: number }>;
  createCrewMember(input: NewCrewInput): Promise<{ member: CrewDto }>;
  decideApproval(id: string, status: "approved" | "declined"): Promise<{ approval: ApprovalDto }>;
}

export function createApiClient(baseUrl: string): ApiClient {
  let accessToken: string | null = null;
  let refreshToken: string | null = null;

  async function request<T>(
    path: string,
    opts: { method?: string; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const headers: Record<string, string> = {};
    if (opts.body !== undefined) headers["Content-Type"] = "application/json";
    if (opts.auth !== false && accessToken)
      headers.Authorization = `Bearer ${accessToken}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message =
        (data && typeof data.error === "string" && data.error) ||
        `Request failed (${res.status})`;
      throw new ApiError(res.status, message, data);
    }
    return data as T;
  }

  return {
    setTokens(a, r) {
      accessToken = a;
      if (r !== undefined) refreshToken = r;
    },
    getRefreshToken: () => refreshToken,
    async register(email, password, name) {
      const r = await request<AuthResult>("/auth/register", {
        method: "POST",
        auth: false,
        body: { email, password, name },
      });
      accessToken = r.accessToken;
      refreshToken = r.refreshToken;
      return r;
    },
    async login(email, password) {
      const r = await request<AuthResult>("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      accessToken = r.accessToken;
      refreshToken = r.refreshToken;
      return r;
    },
    async refresh() {
      const r = await request<{ accessToken: string; refreshToken: string }>(
        "/auth/refresh",
        { method: "POST", auth: false, body: { refreshToken } },
      );
      accessToken = r.accessToken;
      refreshToken = r.refreshToken;
      return r;
    },
    me: () => request<{ user: PublicUser }>("/auth/me"),
    summary: () => request<SummaryDto>("/summary"),
    listWallets: () =>
      request<{ wallets: WalletDto[]; totalMinor: number }>("/wallets"),
    listTransactions: (params) => {
      const q = new URLSearchParams();
      if (params?.limit) q.set("limit", String(params.limit));
      if (params?.needsReview !== undefined)
        q.set("needsReview", String(params.needsReview));
      const qs = q.toString();
      return request<{ transactions: TransactionDto[] }>(
        `/transactions${qs ? `?${qs}` : ""}`,
      );
    },
    listGoals: () => request<{ goals: GoalDto[] }>("/goals"),
    listCaps: () => request<{ caps: CapDto[] }>("/caps"),
    listCategories: () => request<{ categories: CategoryDto[] }>("/categories"),
    listCrew: () => request<{ crew: CrewDto[] }>("/crew"),
    listApprovals: () => request<{ approvals: ApprovalDto[] }>("/approvals"),
    getProfile: () => request<{ profile: ProfileDto }>("/profile"),
    createWallet: (input) =>
      request<{ wallet: WalletDto }>("/wallets", { method: "POST", body: input }),
    createTransaction: (input) =>
      request<{ transaction: TransactionDto }>("/transactions", { method: "POST", body: input }),
    updateTransaction: (id, patch) =>
      request<{ transaction: TransactionDto }>(`/transactions/${id}`, { method: "PATCH", body: patch }),
    createGoal: (input) =>
      request<{ goal: GoalDto }>("/goals", { method: "POST", body: input }),
    contributeGoal: (id, amountMinor) =>
      request<{ goal: GoalDto }>(`/goals/${id}/contribute`, { method: "POST", body: { amountMinor } }),
    importTransactions: (items) =>
      request<{ imported: number; skipped: number }>("/transactions/import", { method: "POST", body: { items } }),
    createCrewMember: (input) =>
      request<{ member: CrewDto }>("/crew", { method: "POST", body: input }),
    decideApproval: (id, status) =>
      request<{ approval: ApprovalDto }>(`/approvals/${id}`, { method: "PATCH", body: { status } }),
  };
}
