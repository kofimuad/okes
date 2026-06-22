import { formatMoney, money, type TransactionDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../components/GlassCard";
import { Icon, Pill } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { api } from "../lib/api";
import { scanSms, smsSupported } from "../lib/sms";
import { useTheme } from "../theme";

type Filter = "all" | "in" | "out";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "in", label: "Income" },
  { key: "out", label: "Spending" },
];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "TODAY";
  if (d.toDateString() === yest.toDateString()) return "YESTERDAY";
  return d.toLocaleDateString([], { month: "long", day: "numeric" }).toUpperCase();
}

export default function TransactionsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["transactions", "all"], queryFn: () => api.listTransactions({ limit: 100 }) });
  const summaryQ = useQuery({ queryKey: ["summary"], queryFn: () => api.summary() });
  const monthIn = summaryQ.data?.month.incomeMinor ?? 0;
  const monthOut = summaryQ.data?.month.spendMinor ?? 0;
  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: () => api.listWallets() });
  const confirm = useMutation({
    mutationFn: (id: string) => api.updateTransaction(id, { needsReview: false }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const [scanning, setScanning] = useState(false);
  const scan = async () => {
    setScanning(true);
    try {
      const byProvider: Record<string, string | undefined> = {};
      for (const w of walletsQ.data?.wallets ?? []) if (!byProvider[w.provider]) byProvider[w.provider] = w.id;
      const items = await scanSms(byProvider);
      const res = await api.importTransactions(items);
      for (const k of ["transactions", "summary", "wallets", "caps"]) qc.invalidateQueries({ queryKey: [k] });
      Alert.alert("SMS scan complete", `${res.imported} captured, ${res.skipped} already recorded.`);
    } catch (e) {
      Alert.alert("Couldn't scan SMS", e instanceof Error ? e.message : "Try again.");
    } finally {
      setScanning(false);
    }
  };

  const all = q.data?.transactions ?? [];
  const reviewCount = all.filter((t) => t.needsReview).length;
  const shown = filter === "all" ? all : all.filter((t) => t.direction === filter);

  const groups: { label: string; items: TransactionDto[] }[] = [];
  for (const t of shown) {
    const label = dayLabel(t.occurredAt);
    const g = groups.find((x) => x.label === label) ?? (groups.push({ label, items: [] }), groups[groups.length - 1]!);
    g.items.push(t);
  }

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>Transactions</Text>
            <View style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="search" size={21} color={colors.textSecondary} />
            </View>
            <View style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="tune" size={20} color={colors.textSecondary} />
            </View>
          </View>

          {smsSupported() && (
            <Pressable
              onPress={scan}
              disabled={scanning}
              style={[styles.scanBtn, { backgroundColor: colors.tintTealStrong, borderColor: colors.hairlineBright }]}
            >
              {scanning ? (
                <ActivityIndicator color={colors.accentCyan} />
              ) : (
                <Icon name="sms" size={18} color={colors.accentCyan} />
              )}
              <Text style={[styles.scanText, { color: colors.accentCyan }]}>
                {scanning ? "Scanning…" : "Scan SMS for transactions"}
              </Text>
            </Pressable>
          )}

          {reviewCount > 0 && (
            <GlassCard tint={colors.tintTeal} style={styles.review}>
              <View style={[styles.reviewIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                <Icon name="inbox" size={22} color={colors.accentCyan} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.reviewTitle, { color: colors.textPrimary }]}>{reviewCount} auto-captured to review</Text>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>Confirm category & wallet</Text>
              </View>
              <View style={[styles.reviewBtn, { backgroundColor: colors.accentCyan }]}>
                <Text style={[styles.reviewBtnText, { color: colors.onAccent }]}>Review</Text>
              </View>
            </GlassCard>
          )}

          <View style={styles.summary}>
            <GlassCard style={styles.sumCard}>
              <View style={styles.sumHead}>
                <View style={[styles.sumIcon, { backgroundColor: colors.tintGreen }]}>
                  <Icon name="trending-up" size={16} color={colors.accentMint} />
                </View>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Money In</Text>
              </View>
              <Text style={[styles.sumValue, { color: colors.textPrimary }]}>{formatMoney(money(monthIn))}</Text>
            </GlassCard>
            <GlassCard style={styles.sumCard}>
              <View style={styles.sumHead}>
                <View style={[styles.sumIcon, { backgroundColor: colors.tintClay }]}>
                  <Icon name="trending-down" size={16} color={colors.accentPink} />
                </View>
                <Text style={[styles.sumLabel, { color: colors.textSecondary }]}>Money Out</Text>
              </View>
              <Text style={[styles.sumValue, { color: colors.textPrimary }]}>{formatMoney(money(monthOut))}</Text>
            </GlassCard>
          </View>

          <View style={styles.filters}>
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => setFilter(f.key)}
                  style={[styles.chip, { backgroundColor: on ? colors.tintTealStrong : colors.surfaceGlass, borderColor: on ? colors.hairlineBright : colors.hairline }]}
                >
                  <Text style={[styles.chipText, { color: on ? colors.accentCyan : colors.textSecondary, fontFamily: on ? fonts.semibold : fonts.medium }]}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {q.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : shown.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="inbox" size={26} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No transactions</Text>
            </GlassCard>
          ) : (
            groups.map((g) => {
              const net = g.items.reduce((s, t) => s + (t.direction === "in" ? t.amountMinor : -t.amountMinor), 0);
              return (
                <View key={g.label} style={{ gap: 14 }}>
                  <View style={styles.dayHead}>
                    <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{g.label}</Text>
                    <Text style={[styles.dayTotal, { color: colors.textMuted }]}>
                      {net >= 0 ? "+ " : "- "}{formatMoney(money(Math.abs(net)))}
                    </Text>
                  </View>
                  {g.items.map((t) => <TxRow key={t.id} tx={t} onConfirm={() => confirm.mutate(t.id)} />)}
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function TxRow({ tx, onConfirm }: { tx: TransactionDto; onConfirm?: () => void }) {
  const { colors } = useTheme();
  const incoming = tx.direction === "in";
  const time = new Date(tx.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: incoming ? colors.tintGreen : colors.tintGold, borderColor: colors.hairline }]}>
        <Icon name={incoming ? "call-received" : "shopping-bag"} size={22} color={incoming ? colors.accentMint : colors.accentAmber} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.party}</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>{time}</Text>
      </View>
      <View style={{ alignItems: "flex-end", gap: 4 }}>
        <Text style={[styles.txAmt, { color: incoming ? colors.accentMint : colors.textPrimary }]}>
          {incoming ? "+ " : "- "}{formatMoney(money(tx.amountMinor))}
        </Text>
        {tx.needsReview && onConfirm ? (
          <Pressable onPress={onConfirm}>
            <Pill bg={colors.tintGold} style={{ paddingVertical: 3, paddingHorizontal: 8 }}>
              <Icon name="check" size={12} color={colors.accentAmber} />
              <Text style={[styles.autoText, { color: colors.accentAmber }]}>Confirm</Text>
            </Pill>
          </Pressable>
        ) : tx.auto ? (
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
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20, fontWeight: "600" },
  review: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  reviewIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  reviewTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  scanBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 13, borderRadius: radius.pill, borderWidth: 1 },
  scanText: { fontFamily: fonts.semibold, fontSize: 13 },
  reviewBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  reviewBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  summary: { flexDirection: "row", gap: 12 },
  sumCard: { flex: 1, gap: 8, padding: 16 },
  sumHead: { flexDirection: "row", alignItems: "center", gap: 7 },
  sumIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  sumLabel: { fontFamily: fonts.medium, fontSize: 12 },
  sumValue: { fontFamily: fonts.displayBold, fontSize: 20 },
  filters: { flexDirection: "row", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontFamily: fonts.body, fontSize: 13 },
  dayHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayLabel: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1 },
  dayTotal: { fontFamily: fonts.medium, fontSize: 12 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  txName: { fontFamily: fonts.semibold, fontSize: 14 },
  txAmt: { fontFamily: fonts.displayBold, fontSize: 14 },
  autoText: { fontFamily: fonts.semibold, fontSize: 10 },
});
