import {
  boolean,
  date,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// --- enums ------------------------------------------------------------------
export const walletProvider = pgEnum("wallet_provider", [
  "mtn_momo",
  "telecel_cash",
  "airteltigo_money",
  "bank",
]);
export const syncSource = pgEnum("sync_source", ["sms", "aggregator", "manual"]);
export const txDirection = pgEnum("tx_direction", ["in", "out"]);
export const crewRole = pgEnum("crew_role", [
  "watcher",
  "accountability",
  "guardian",
]);
export const approvalStatus = pgEnum("approval_status", [
  "pending",
  "approved",
  "declined",
]);

const id = () => uuid("id").primaryKey().defaultRandom();
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
/** Money is stored in minor units (pesewas). */
const amount = (name: string) => integer(name).notNull().default(0);
const currency = () => varchar("currency", { length: 3 }).notNull().default("GHS");

// --- tables -----------------------------------------------------------------
export const users = pgTable("users", {
  id: id(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  // gamification
  xp: integer("xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  createdAt: createdAt(),
});

export const refreshTokens = pgTable("refresh_tokens", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const wallets = pgTable("wallets", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  provider: walletProvider("provider").notNull(),
  label: varchar("label", { length: 120 }).notNull(),
  maskedNumber: varchar("masked_number", { length: 40 }).notNull(),
  balanceMinor: amount("balance_minor"),
  currency: currency(),
  syncSource: syncSource("sync_source").notNull().default("manual"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: createdAt(),
});

export const categories = pgTable("categories", {
  id: id(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 80 }).notNull(),
  icon: varchar("icon", { length: 60 }).notNull(),
});

export const transactions = pgTable("transactions", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  walletId: uuid("wallet_id")
    .notNull()
    .references(() => wallets.id, { onDelete: "cascade" }),
  direction: txDirection("direction").notNull(),
  amountMinor: amount("amount_minor"),
  currency: currency(),
  party: varchar("party", { length: 160 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  auto: boolean("auto").notNull().default(false),
  needsReview: boolean("needs_review").notNull().default(false),
  createdAt: createdAt(),
});

export const goals = pgTable("goals", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 120 }).notNull(),
  icon: varchar("icon", { length: 60 }).notNull(),
  targetMinor: amount("target_minor"),
  savedMinor: amount("saved_minor"),
  currency: currency(),
  deadline: date("deadline"),
  createdAt: createdAt(),
});

export const caps = pgTable("caps", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  limitMinor: amount("limit_minor"),
  currency: currency(),
  alertThresholds: integer("alert_thresholds").array().notNull().default([70, 90, 100]),
  lockAtLimit: boolean("lock_at_limit").notNull().default(false),
  notifyCrew: boolean("notify_crew").notNull().default(false),
  createdAt: createdAt(),
});

export const crew = pgTable("crew", {
  id: id(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Linked Okes user, if the friend has an account. */
  friendUserId: uuid("friend_user_id").references(() => users.id),
  name: varchar("name", { length: 120 }).notNull(),
  initial: varchar("initial", { length: 4 }).notNull(),
  role: crewRole("role").notNull().default("watcher"),
  online: boolean("online").notNull().default(false),
  createdAt: createdAt(),
});

export const incomeStreams = pgTable("income_streams", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 120 }).notNull(),
  expectedMinor: amount("expected_minor"),
  currency: currency(),
  recurring: boolean("recurring").notNull().default(true),
  createdAt: createdAt(),
});

export const approvals = pgTable("approvals", {
  id: id(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  guardianCrewId: uuid("guardian_crew_id").references(() => crew.id, {
    onDelete: "set null",
  }),
  amountMinor: amount("amount_minor"),
  currency: currency(),
  reason: varchar("reason", { length: 200 }).notNull(),
  status: approvalStatus("status").notNull().default("pending"),
  createdAt: createdAt(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Wallet = typeof wallets.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Cap = typeof caps.$inferSelect;
export type CrewMember = typeof crew.$inferSelect;
export type IncomeStream = typeof incomeStreams.$inferSelect;
export type Approval = typeof approvals.$inferSelect;
