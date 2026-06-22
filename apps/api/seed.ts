/**
 * Seeds a demo account that mirrors the Pencil designs.
 * Run: pnpm db:seed   (login with the credentials printed at the end)
 */
import {
  approvals,
  caps,
  categories,
  createDb,
  crew,
  goals,
  transactions,
  users,
  wallets,
} from "@okes/db";
import { eq } from "drizzle-orm";
import argon2 from "argon2";

const DEMO_EMAIL = "demo@okes.app";
const DEMO_PASSWORD = "okes1234";

const db = createDb(
  process.env.DATABASE_URL ?? "postgres://okes:okes@localhost:55432/okes",
);

const ago = (mins: number) => new Date(Date.now() - mins * 60_000);

async function main() {
  // Idempotent: wipe any previous demo user (cascades to all their data).
  await db.delete(users).where(eq(users.email, DEMO_EMAIL));

  const [user] = await db
    .insert(users)
    .values({
      email: DEMO_EMAIL,
      name: "Kwame Mensah",
      passwordHash: await argon2.hash(DEMO_PASSWORD),
      xp: 3420,
      level: 7,
      streakDays: 7,
    })
    .returning();
  const userId = user!.id;

  const cat = async (name: string, icon: string) =>
    (await db.insert(categories).values({ userId, name, icon }).returning())[0]!;
  const food = await cat("Food & Dining", "restaurant");
  const transport = await cat("Transport", "directions_car");
  const data = await cat("Data & Airtime", "wifi");
  const shopping = await cat("Shopping", "shopping_bag");

  const wallet = async (
    provider: "mtn_momo" | "telecel_cash" | "airteltigo_money" | "bank",
    label: string,
    masked: string,
    balanceMinor: number,
    syncSource: "sms" | "aggregator" | "manual",
  ) =>
    (
      await db
        .insert(wallets)
        .values({ userId, provider, label, maskedNumber: masked, balanceMinor, syncSource, lastSyncedAt: ago(2) })
        .returning()
    )[0]!;
  const momo = await wallet("mtn_momo", "MTN MoMo", "•••• 8 0241", 324000, "sms");
  const telecel = await wallet("telecel_cash", "Telecel Cash", "•••• 5 7732", 118050, "sms");
  await wallet("airteltigo_money", "AirtelTigo Money", "•••• 2 9100", 76000, "sms");
  const bank = await wallet("bank", "GCB Bank", "•••• 4821", 730000, "aggregator");

  const tx = (
    walletId: string,
    direction: "in" | "out",
    amountMinor: number,
    party: string,
    categoryId: string | null,
    minsAgo: number,
    auto: boolean,
    needsReview = false,
  ) => ({ userId, walletId, direction, amountMinor, party, categoryId, occurredAt: ago(minsAgo), auto, needsReview });

  await db.insert(transactions).values([
    tx(momo.id, "in", 25000, "Akua Mensah", null, 30, true),
    tx(bank.id, "in", 180000, "Freelance — Acme", null, 90, true),
    tx(bank.id, "in", 420000, "Salary — Acme", null, 60 * 24 * 3, true),
    tx(momo.id, "out", 6450, "Bolt Food", food.id, 120, true, true),
    tx(momo.id, "out", 50000, "Market groceries", food.id, 60 * 20, true),
    tx(telecel.id, "out", 31550, "Chop bar lunch", food.id, 60 * 26, true),
    tx(momo.id, "out", 24000, "Bolt rides", transport.id, 60 * 28, true),
    tx(telecel.id, "out", 9500, "MTN data bundle", data.id, 60 * 30, true),
    tx(bank.id, "out", 28000, "DSTV Subscription", shopping.id, 60 * 32, false),
    tx(momo.id, "out", 24000, "New sneakers", shopping.id, 60 * 40, true),
    tx(telecel.id, "out", 10000, "ECG Prepaid", null, 60 * 22, true),
  ]);

  await db.insert(goals).values([
    { userId, name: "MacBook for work", icon: "laptop", targetMinor: 900000, savedMinor: 558000, deadline: "2026-12-01" },
    { userId, name: "Emergency Fund", icon: "health_and_safety", targetMinor: 500000, savedMinor: 225000 },
    { userId, name: "Trip to Cape Coast", icon: "beach_access", targetMinor: 80000, savedMinor: 64000, deadline: "2026-08-15" },
  ]);

  await db.insert(caps).values([
    { userId, categoryId: food.id, limitMinor: 100000, notifyCrew: true, lockAtLimit: false },
    { userId, categoryId: transport.id, limitMinor: 40000 },
    { userId, categoryId: data.id, limitMinor: 15000 },
    { userId, categoryId: shopping.id, limitMinor: 45000, lockAtLimit: true },
  ]);

  const [ama] = await db
    .insert(crew)
    .values([
      { ownerId: userId, name: "Ama Owusu", initial: "A", role: "guardian", online: true },
      { ownerId: userId, name: "Yaw Boateng", initial: "Y", role: "accountability", online: true },
      { ownerId: userId, name: "Kofi Mensah", initial: "K", role: "watcher", online: false },
    ])
    .returning();

  await db.insert(approvals).values({
    userId,
    guardianCrewId: ama!.id,
    amountMinor: 85000,
    reason: "Laptop accessory",
    status: "pending",
  });

  console.log(`\n✅ Seeded demo account:\n   email:    ${DEMO_EMAIL}\n   password: ${DEMO_PASSWORD}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
