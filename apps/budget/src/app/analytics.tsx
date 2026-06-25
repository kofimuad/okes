import { formatMoney, money, type AnalyticsSlice } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DonutChart, TrendChart } from "../components/Charts";
import { GlassCard } from "../components/GlassCard";
import { Icon } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { api } from "../lib/api";
import { useTheme } from "../theme";

const RANGES: { label: string; months: number }[] = [
  { label: "1M", months: 1 },
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
];

export default function AnalyticsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [months, setMonths] = useState(6);
  const q = useQuery({ queryKey: ["analytics", months], queryFn: () => api.getAnalytics(months) });
  const data = q.data;

  const palette = [colors.accentCyan, colors.accentViolet, colors.accentMint, colors.accentAmber, colors.accentPink];
  const chartW = Dimensions.get("window").width - 40 - 32;

  const periodBalance = (data?.income.totalMinor ?? 0) - (data?.expense.totalMinor ?? 0);

  // cumulative net per month for the trend
  let run = 0;
  const trend = (data?.series ?? []).map((s) => (run += s.income - s.spend));

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Analytics</Text>
          </View>

          <View style={styles.cards}>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Balance</Text>
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>{formatMoney(money(data?.balanceMinor ?? 0))}</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Period balance</Text>
              <Text style={[styles.statValue, { color: periodBalance >= 0 ? colors.accentMint : colors.accentPink }]}>
                {periodBalance >= 0 ? "+" : "-"}{formatMoney(money(Math.abs(periodBalance)))}
              </Text>
            </GlassCard>
          </View>

          <View style={styles.ranges}>
            {RANGES.map((r) => {
              const on = r.months === months;
              return (
                <Pressable key={r.label} onPress={() => setMonths(r.months)} style={[styles.range, { backgroundColor: on ? colors.accentCyan : colors.surfaceGlass, borderColor: on ? colors.accentCyan : colors.hairline }]}>
                  <Text style={[styles.rangeText, { color: on ? colors.onAccent : colors.textSecondary }]}>{r.label}</Text>
                </Pressable>
              );
            })}
          </View>

          {q.isLoading || !data ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 30 }} />
          ) : (
            <>
              <GlassCard style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Cash flow</Text>
                {trend.length < 2 ? (
                  <Text style={[styles.muted, { color: colors.textMuted }]}>Not enough history yet.</Text>
                ) : (
                  <TrendChart values={trend} color={colors.accentMint} width={chartW} />
                )}
              </GlassCard>

              <Breakdown title="Income" total={data.income.totalMinor} slices={data.income.byCategory} palette={palette} track={colors.trackBg} />
              <Breakdown title="Expenses" total={data.expense.totalMinor} slices={data.expense.byCategory} palette={palette} track={colors.trackBg} />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Breakdown({ title, total, slices, palette, track }: { title: string; total: number; slices: AnalyticsSlice[]; palette: string[]; track: string }) {
  const { colors } = useTheme();
  const colored = slices.map((s, i) => ({ ...s, color: palette[i % palette.length]! }));
  return (
    <GlassCard style={{ gap: 14 }}>
      <View style={styles.rowBetween}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sectionTotal, { color: title === "Income" ? colors.accentMint : colors.accentPink }]}>{formatMoney(money(total))}</Text>
      </View>
      {slices.length === 0 ? (
        <Text style={[styles.muted, { color: colors.textMuted }]}>No {title.toLowerCase()} in this period.</Text>
      ) : (
        <>
          <View style={{ alignItems: "center" }}>
            <DonutChart slices={colored.map((s) => ({ value: s.amountMinor, color: s.color }))} track={track} />
          </View>
          <View style={{ gap: 8 }}>
            {colored.map((s) => {
              const pct = total > 0 ? Math.round((s.amountMinor / total) * 100) : 0;
              return (
                <View key={s.name} style={styles.legendRow}>
                  <View style={[styles.dot, { backgroundColor: s.color }]} />
                  <Text style={[styles.legendName, { color: colors.textPrimary }]} numberOfLines={1}>{s.name}</Text>
                  <Text style={[styles.legendPct, { color: colors.textMuted }]}>{pct}%</Text>
                  <Text style={[styles.legendAmt, { color: colors.textSecondary }]}>{formatMoney(money(s.amountMinor))}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  cards: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, gap: 6, padding: 16 },
  statLabel: { fontFamily: fonts.medium, fontSize: 12 },
  statValue: { fontFamily: fonts.displayBold, fontSize: 19 },
  ranges: { flexDirection: "row", gap: 8 },
  range: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: radius.pill, borderWidth: 1 },
  rangeText: { fontFamily: fonts.semibold, fontSize: 13 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17 },
  sectionTotal: { fontFamily: fonts.displayBold, fontSize: 16 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { fontFamily: fonts.body, fontSize: 13 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { flex: 1, fontFamily: fonts.medium, fontSize: 13 },
  legendPct: { fontFamily: fonts.semibold, fontSize: 12, width: 40, textAlign: "right" },
  legendAmt: { fontFamily: fonts.semibold, fontSize: 13, width: 90, textAlign: "right" },
});
