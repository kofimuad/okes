import { formatMoney, money, type NewTransactionInput, type TransactionDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { KenteRow, ProgressRing } from "../../components/Decor";
import { Field, ChipSelect, SheetButton, toMinor } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon, Pill, ProgressBar, SectionHeader } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Sheet } from "../../components/Sheet";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const QUICK = [
  { label: "Add", icon: "add", key: "cyan", route: null },
  { label: "Send", icon: "north-east", key: "violet", route: null },
  { label: "Goals", icon: "savings", key: "mint", route: "/goals" },
  { label: "Scan", icon: "document-scanner", key: "amber", route: null },
] as const;

const MISSIONS = [
  { title: "No-spend day", icon: "savings", xp: 50, progress: 0.4, key: "mint" },
  { title: "Log all income", icon: "receipt-long", xp: 30, progress: 1, key: "cyan" },
] as const;

const DIRECTION_OPTIONS: { value: "in" | "out"; label: string }[] = [
  { value: "out", label: "Spending" },
  { value: "in", label: "Income" },
];

function txTime(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function CommandCenter() {
  const { mode, colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const summaryQ = useQuery({ queryKey: ["summary"], queryFn: () => api.summary() });
  const txQ = useQuery({ queryKey: ["transactions", "recent"], queryFn: () => api.listTransactions({ limit: 5 }) });
  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: () => api.listWallets() });
  const capsQ = useQuery({ queryKey: ["caps"], queryFn: () => api.listCaps() });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
  const goalsQ = useQuery({ queryKey: ["goals"], queryFn: () => api.listGoals() });
  const profileQ = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });

  const accent: Record<string, string> = { cyan: colors.accentCyan, violet: colors.accentViolet, mint: colors.accentMint, amber: colors.accentAmber, pink: colors.accentPink };
  const tint: Record<string, string> = { cyan: colors.tintTeal, violet: colors.tintViolet, mint: colors.tintGreen, amber: colors.tintGold, pink: colors.tintClay };

  const [addOpen, setAddOpen] = useState(false);
  const [walletId, setWalletId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const wallets = walletsQ.data?.wallets ?? [];
  const activeWallet = walletId ?? wallets[0]?.id ?? null;

  const addTx = useMutation({
    mutationFn: (input: NewTransactionInput) => api.createTransaction(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      qc.invalidateQueries({ queryKey: ["caps"] });
      qc.invalidateQueries({ queryKey: ["wallets"] });
      setAddOpen(false); setParty(""); setAmount("");
    },
  });

  const firstName = user?.name?.split(" ")[0] ?? "Captain";
  const balanceMinor = summaryQ.data?.balanceMinor ?? 0;
  const major = Math.floor(balanceMinor / 100).toLocaleString("en-GH");
  const cents = String(Math.abs(balanceMinor % 100)).padStart(2, "0");
  const walletCount = summaryQ.data?.walletCount ?? 0;
  const monthIn = summaryQ.data?.month.incomeMinor ?? 0;
  const monthOut = summaryQ.data?.month.spendMinor ?? 0;
  const net = monthIn - monthOut;
  const spendRatio = monthIn > 0 ? Math.min(monthOut / monthIn, 1) : monthOut > 0 ? 1 : 0;
  const transactions = txQ.data?.transactions ?? [];
  const streak = profileQ.data?.profile.streakDays ?? 0;

  const catMap = new Map((catsQ.data?.categories ?? []).map((c) => [c.id, c]));
  const ratio = (c: { spentMinor: number; limitMinor: number }) => (c.limitMinor > 0 ? c.spentMinor / c.limitMinor : 0);
  const caps = [...(capsQ.data?.caps ?? [])].sort((a, b) => ratio(b) - ratio(a));
  const topCap = caps[0];
  const statusColor = (s: string) => (s === "over" ? colors.accentPink : s === "near" ? colors.accentAmber : colors.accentMint);
  const goal = goalsQ.data?.goals?.[0];

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ gap: 5 }}>
              <KenteRow colors={[colors.accentAmber, colors.accentCyan, colors.accentPink, colors.accentViolet]} />
              <Text style={[styles.eyebrow, { color: colors.accentCyan }]}>MISSION DAY 128</Text>
              <Text style={[styles.greeting, { color: colors.textPrimary }]}>Good morning, {firstName}</Text>
            </View>
            <View style={styles.headerActions}>
              <View style={[styles.circleBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                <Icon name="notifications" size={22} color={colors.textPrimary} />
                <View style={[styles.dot, { backgroundColor: colors.accentPink, borderColor: colors.bgDeep }]} />
              </View>
              <View style={[styles.circleBtn, { backgroundColor: colors.tintViolet, borderColor: colors.hairlineBright }]}>
                <Icon name="smart-toy" size={22} color={colors.accentCyan} />
              </View>
            </View>
          </View>

          {/* Balance hero */}
          <GlassCard>
            <View style={styles.rowBetween}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>TOTAL BALANCE</Text>
              {summaryQ.isLoading ? <ActivityIndicator color={colors.textMuted} /> : null}
            </View>
            <View style={styles.balanceRow}>
              <Text style={[styles.currency, { color: colors.textSecondary }]}>GHS </Text>
              <Text style={[styles.amount, { color: colors.textPrimary }]}>{major}</Text>
              <Text style={[styles.cents, { color: colors.textSecondary }]}>.{cents}</Text>
            </View>
            <View style={styles.chipsRow}>
              <Pill bg={net >= 0 ? colors.tintGreen : colors.tintClay}>
                <Icon name={net >= 0 ? "trending-up" : "trending-down"} size={15} color={net >= 0 ? colors.accentMint : colors.accentPink} />
                <Text style={[styles.chipText, { color: net >= 0 ? colors.accentMint : colors.accentPink }]}>{formatMoney(money(net))} this month</Text>
              </Pill>
              <Text style={[styles.muted, { color: colors.textMuted }]}>{walletCount} linked wallets</Text>
            </View>
            <View style={styles.runway}>
              <View style={styles.rowBetween}>
                <View style={styles.rowG6}>
                  <Icon name="bolt" size={16} color={colors.accentViolet} />
                  <Text style={[styles.runwayLabel, { color: colors.textSecondary }]}>Spent of income this month</Text>
                </View>
                <Text style={[styles.runwayDays, { color: colors.textPrimary }]}>{Math.round(spendRatio * 100)}%</Text>
              </View>
              <ProgressBar value={spendRatio} color={spendRatio >= 0.9 ? colors.accentPink : colors.accentCyan} />
            </View>
          </GlassCard>

          {/* Quick actions */}
          <View style={styles.quickRow}>
            {QUICK.map((q) => (
              <Pressable key={q.label} style={styles.quickItem} onPress={() => { if (q.label === "Add") setAddOpen(true); else if (q.route) router.push(q.route); }}>
                <View style={[styles.quickCircle, { backgroundColor: tint[q.key], borderColor: colors.hairline }]}>
                  <Icon name={q.icon as never} size={24} color={accent[q.key]} />
                </View>
                <Text style={[styles.quickLabel, { color: colors.textSecondary }]}>{q.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Missions */}
          <View style={{ gap: 12 }}>
            <View style={styles.rowBetween}>
              <View style={styles.rowG8}>
                <Icon name="local-fire-department" size={20} color={colors.accentAmber} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Today's Missions</Text>
              </View>
              <Pill bg={colors.tintGold}>
                <Text style={[styles.chipText, { color: colors.accentAmber }]}>{streak} day streak</Text>
              </Pill>
            </View>
            <View style={styles.missionsRow}>
              {MISSIONS.map((m) => {
                const done = m.progress >= 1;
                const col = m.key === "mint" ? colors.accentMint : colors.accentCyan;
                return (
                  <GlassCard key={m.title} style={styles.missionCard}>
                    <View style={styles.rowBetween}>
                      <View style={[styles.missionIcon, { backgroundColor: done ? colors.tintGreen : colors.tintTeal }]}>
                        <Icon name={m.icon as never} size={20} color={col} />
                      </View>
                      <Pill bg={colors.tintViolet}><Text style={[styles.xp, { color: colors.accentViolet }]}>+{m.xp} XP</Text></Pill>
                    </View>
                    <Text style={[styles.missionTitle, { color: colors.textPrimary }]}>{m.title}</Text>
                    <ProgressBar value={m.progress} color={done ? colors.accentMint : col} height={6} />
                  </GlassCard>
                );
              })}
            </View>
          </View>

          {/* Spending caps */}
          {topCap && (
            <View style={{ gap: 12 }}>
              <SectionHeader icon="speed" iconColor={colors.accentCyan} title="Spending Caps" action="Manage" onAction={() => router.push("/transactions")} />
              <GlassCard style={{ gap: 16 }}>
                <View style={styles.capMain}>
                  <ProgressRing size={76} strokeWidth={8} progress={ratio(topCap)} color={statusColor(topCap.status)} track={colors.trackBg}>
                    <Text style={[styles.ringPct, { color: colors.textPrimary }]}>{Math.round(ratio(topCap) * 100)}%</Text>
                  </ProgressRing>
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={[styles.capName, { color: colors.textPrimary }]}>{catMap.get(topCap.categoryId)?.name ?? "Category"}</Text>
                    <Text style={[styles.muted, { color: colors.textSecondary }]}>{formatMoney(money(topCap.spentMinor))} of {formatMoney(money(topCap.limitMinor), { withCode: false })}</Text>
                    {topCap.status !== "on_track" && (
                      <Pill bg={topCap.status === "over" ? colors.tintClay : colors.tintGold} style={{ alignSelf: "flex-start" }}>
                        <Icon name="warning" size={13} color={statusColor(topCap.status)} />
                        <Text style={[styles.chipTextSm, { color: statusColor(topCap.status) }]}>
                          {topCap.status === "over" ? "Over budget" : `${formatMoney(money(topCap.limitMinor - topCap.spentMinor), { withCode: false })} left`}
                        </Text>
                      </Pill>
                    )}
                  </View>
                </View>
                {caps.slice(1, 3).map((c) => (
                  <View key={c.id} style={{ gap: 7 }}>
                    <View style={styles.rowBetween}>
                      <Text style={[styles.capRowName, { color: colors.textPrimary }]}>{catMap.get(c.categoryId)?.name ?? "Category"}</Text>
                      <Text style={[styles.muted, { color: colors.textSecondary }]}>{formatMoney(money(c.spentMinor), { withCode: false })} / {formatMoney(money(c.limitMinor), { withCode: false })}</Text>
                    </View>
                    <ProgressBar value={ratio(c)} color={statusColor(c.status)} height={6} />
                  </View>
                ))}
              </GlassCard>
            </View>
          )}

          {/* Top savings goal */}
          {goal && (
            <View style={{ gap: 12 }}>
              <SectionHeader icon="flag" iconColor={colors.accentMint} title="Top Savings Goal" action="All goals" onAction={() => router.push("/goals")} />
              <LinearGradient colors={[colors.tintGreen, colors.tintViolet]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.goalCard, { borderColor: colors.hairlineBright }]}>
                <View style={styles.rowG12}>
                  <View style={[styles.goalIcon, { backgroundColor: colors.tintGreen }]}>
                    <Icon name={(goal.icon as never) || "savings"} size={24} color={colors.accentMint} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.goalName, { color: colors.textPrimary }]}>{goal.name}</Text>
                    {goal.deadline ? <Text style={[styles.muted, { color: colors.textSecondary }]}>by {goal.deadline}</Text> : null}
                  </View>
                  <Text style={[styles.goalPct, { color: colors.accentMint }]}>{Math.round((goal.targetMinor > 0 ? goal.savedMinor / goal.targetMinor : 0) * 100)}%</Text>
                </View>
                <ProgressBar value={goal.targetMinor > 0 ? goal.savedMinor / goal.targetMinor : 0} color={colors.accentMint} />
                <View style={styles.rowBetween}>
                  <Text style={[styles.muted, { color: colors.textPrimary }]}>{formatMoney(money(goal.savedMinor))} / {formatMoney(money(goal.targetMinor), { withCode: false })}</Text>
                  <Pill bg={colors.tintTeal}>
                    <Icon name="psychology" size={13} color={colors.accentCyan} />
                    <Text style={[styles.chipTextSm, { color: colors.accentCyan }]}>AI plan</Text>
                  </Pill>
                </View>
              </LinearGradient>
            </View>
          )}

          {/* Recent activity */}
          <View style={{ gap: 14 }}>
            <SectionHeader icon="bolt" iconColor={colors.accentViolet} title="Recent Activity" action="See all" onAction={() => router.push("/transactions")} />
            {txQ.isLoading ? (
              <ActivityIndicator color={colors.accentCyan} style={{ marginVertical: 16 }} />
            ) : transactions.length === 0 ? (
              <GlassCard style={{ alignItems: "center", gap: 6 }}>
                <Icon name="inbox" size={26} color={colors.textMuted} />
                <Text style={[styles.muted, { color: colors.textSecondary }]}>No transactions yet</Text>
              </GlassCard>
            ) : (
              transactions.map((t) => <TxRow key={t.id} tx={t} />)
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={addOpen} onClose={() => setAddOpen(false)} title="Add transaction">
        {wallets.length === 0 ? (
          <View style={{ gap: 12, alignItems: "center", paddingVertical: 8 }}>
            <Icon name="account-balance-wallet" size={28} color={colors.textMuted} />
            <Text style={[styles.muted, { color: colors.textSecondary }]}>Link a wallet first to add transactions.</Text>
            <SheetButton label="Go to Wallets" onPress={() => { setAddOpen(false); router.push("/wallets"); }} />
          </View>
        ) : (
          <>
            <ChipSelect label="WALLET" value={activeWallet ?? ""} options={wallets.map((w) => ({ value: w.id, label: w.label }))} onChange={setWalletId} />
            <ChipSelect label="TYPE" value={direction} options={DIRECTION_OPTIONS} onChange={setDirection} />
            <Field label="DESCRIPTION" value={party} onChangeText={setParty} placeholder="e.g. Bolt Food" />
            <Field label="AMOUNT (GHS)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
            <SheetButton
              label="Add transaction"
              busy={addTx.isPending}
              disabled={!activeWallet || toMinor(amount) <= 0}
              onPress={() => activeWallet && addTx.mutate({ walletId: activeWallet, direction, party: party.trim() || "Transaction", amountMinor: toMinor(amount) })}
            />
          </>
        )}
      </Sheet>
    </ScreenBackground>
  );
}

function TxRow({ tx }: { tx: TransactionDto }) {
  const { colors } = useTheme();
  const incoming = tx.direction === "in";
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: incoming ? colors.tintGreen : colors.tintGold, borderColor: colors.hairline }]}>
        <Icon name={incoming ? "call-received" : "shopping-bag"} size={22} color={incoming ? colors.accentMint : colors.accentAmber} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.party}</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>{txTime(tx.occurredAt)}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.txAmt, { color: incoming ? colors.accentMint : colors.textPrimary }]}>{incoming ? "+ " : "- "}{formatMoney(money(tx.amountMinor))}</Text>
        {tx.auto ? (
          <Pill bg={colors.tintTeal} style={{ paddingVertical: 2, paddingHorizontal: 7 }}>
            <Icon name="autorenew" size={11} color={colors.accentCyan} />
            <Text style={[styles.autoText, { color: colors.accentCyan }]}>Auto</Text>
          </Pill>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 22 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  eyebrow: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.5 },
  greeting: { fontFamily: fonts.display, fontSize: 24 },
  circleBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  dot: { position: "absolute", top: 9, right: 11, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowG6: { flexDirection: "row", alignItems: "center", gap: 6 },
  rowG8: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowG12: { flexDirection: "row", alignItems: "center", gap: 12 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17, fontWeight: "600" },
  motif: { position: "absolute", top: -16, right: -10 },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2 },
  balanceRow: { flexDirection: "row", alignItems: "baseline", marginTop: 12 },
  currency: { fontFamily: fonts.display, fontSize: 24 },
  amount: { fontFamily: fonts.displayBold, fontSize: 40 },
  cents: { fontFamily: fonts.display, fontSize: 24 },
  chipsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  chipText: { fontFamily: fonts.semibold, fontSize: 12 },
  chipTextSm: { fontFamily: fonts.semibold, fontSize: 11 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  runway: { marginTop: 18, gap: 8 },
  runwayLabel: { fontFamily: fonts.body, fontSize: 13 },
  runwayDays: { fontFamily: fonts.display, fontSize: 14 },
  quickRow: { flexDirection: "row", justifyContent: "space-between" },
  quickItem: { alignItems: "center", gap: 8 },
  quickCircle: { width: 56, height: 56, borderRadius: radius.lg, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontFamily: fonts.medium, fontSize: 12 },
  missionsRow: { flexDirection: "row", gap: 12 },
  missionCard: { flex: 1, gap: 12, padding: 14 },
  missionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  missionTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  xp: { fontFamily: fonts.bold, fontSize: 11 },
  capMain: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringPct: { fontFamily: fonts.displayBold, fontSize: 18 },
  capName: { fontFamily: fonts.semibold, fontSize: 15 },
  capRowName: { fontFamily: fonts.medium, fontSize: 13 },
  goalCard: { borderRadius: radius.card, borderWidth: 1, padding: 18, gap: 14, overflow: "hidden" },
  goalIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  goalName: { fontFamily: fonts.semibold, fontSize: 15 },
  goalPct: { fontFamily: fonts.displayBold, fontSize: 20 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  txName: { fontFamily: fonts.semibold, fontSize: 14 },
  txAmt: { fontFamily: fonts.displayBold, fontSize: 14 },
  autoText: { fontFamily: fonts.semibold, fontSize: 10 },
});
