import { formatMoney, money, type TransactionDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../components/GlassCard";
import { Icon, Pill } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { api } from "../lib/api";
import { useTheme } from "../theme";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
const monthStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const monthEnd = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();

export default function CalendarScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState(() => monthStart(new Date()));
  const [selected, setSelected] = useState(() => new Date());

  const from = monthStart(cursor).toISOString();
  const to = monthEnd(cursor).toISOString();
  const monthQ = useQuery({
    queryKey: ["transactions", "month", from],
    queryFn: () => api.listTransactions({ from, to, limit: 200 }),
  });
  const plannedQ = useQuery({ queryKey: ["transactions", "planned"], queryFn: () => api.listTransactions({ paid: false, limit: 100 }) });

  const markPaid = useMutation({
    mutationFn: (id: string) => api.updateTransaction(id, { paid: true }),
    onSuccess: () => { for (const k of ["transactions", "summary", "wallets", "caps"]) qc.invalidateQueries({ queryKey: [k] }); },
  });

  const txns = monthQ.data?.transactions ?? [];
  const planned = plannedQ.data?.transactions ?? [];
  const byDay = (d: Date) => txns.filter((t) => sameDay(new Date(t.occurredAt), d));
  const selectedTx = byDay(selected);

  // Build the month grid (leading blanks + days).
  const first = monthStart(cursor);
  const daysInMonth = monthEnd(cursor).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));

  const monthLabel = cursor.toLocaleDateString([], { month: "long", year: "numeric" });
  const shift = (n: number) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Calendar</Text>
          </View>

          <GlassCard style={{ gap: 14 }}>
            <View style={styles.monthNav}>
              <Pressable onPress={() => shift(-1)} hitSlop={10}><Icon name="chevron-left" size={22} color={colors.textSecondary} /></Pressable>
              <Text style={[styles.monthLabel, { color: colors.textPrimary }]}>{monthLabel}</Text>
              <Pressable onPress={() => shift(1)} hitSlop={10}><Icon name="chevron-right" size={22} color={colors.textSecondary} /></Pressable>
            </View>
            <View style={styles.weekRow}>
              {WEEKDAYS.map((w, i) => <Text key={i} style={[styles.weekday, { color: colors.textMuted }]}>{w}</Text>)}
            </View>
            <View style={styles.grid}>
              {cells.map((d, i) => {
                if (!d) return <View key={`b${i}`} style={styles.cell} />;
                const has = byDay(d);
                const net = has.reduce((s, t) => s + (t.direction === "in" ? t.amountMinor : -t.amountMinor), 0);
                const isSel = sameDay(d, selected);
                const isToday = sameDay(d, new Date());
                return (
                  <Pressable key={i} style={styles.cell} onPress={() => setSelected(d)}>
                    <View style={[styles.dayCircle, isSel && { backgroundColor: colors.accentCyan }]}>
                      <Text style={[styles.dayNum, { color: isSel ? colors.onAccent : isToday ? colors.accentCyan : colors.textPrimary }]}>{d.getDate()}</Text>
                    </View>
                    {has.length > 0 && <View style={[styles.dot, { backgroundColor: isSel ? colors.onAccent : net >= 0 ? colors.accentMint : colors.accentPink }]} />}
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <Text style={[styles.section, { color: colors.textPrimary }]}>
            {sameDay(selected, new Date()) ? "Today" : selected.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
          </Text>
          {monthQ.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} />
          ) : selectedTx.length === 0 ? (
            <Text style={[styles.muted, { color: colors.textMuted }]}>Nothing on this day.</Text>
          ) : (
            selectedTx.map((t) => <DayRow key={t.id} tx={t} onMarkPaid={() => markPaid.mutate(t.id)} />)
          )}

          {planned.length > 0 && (
            <>
              <Text style={[styles.section, { color: colors.textPrimary }]}>Planned</Text>
              {planned.map((t) => <DayRow key={t.id} tx={t} planned onMarkPaid={() => markPaid.mutate(t.id)} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function DayRow({ tx, planned, onMarkPaid }: { tx: TransactionDto; planned?: boolean; onMarkPaid: () => void }) {
  const { colors } = useTheme();
  const incoming = tx.direction === "in";
  return (
    <GlassCard style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: incoming ? colors.tintGreen : colors.tintGold }]}>
        <Icon name={incoming ? "call-received" : "shopping-bag"} size={20} color={incoming ? colors.accentMint : colors.accentAmber} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.rowName, { color: colors.textPrimary }]}>{tx.party}</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>
          {planned ? new Date(tx.occurredAt).toLocaleDateString() : new Date(tx.occurredAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          {tx.recurrence !== "none" ? ` · repeats ${tx.recurrence}` : ""}
        </Text>
      </View>
      {!tx.paid ? (
        <Pressable onPress={onMarkPaid}>
          <Pill bg={colors.tintTealStrong} style={{ paddingVertical: 5, paddingHorizontal: 10 }}>
            <Icon name="check" size={13} color={colors.accentCyan} />
            <Text style={[styles.payText, { color: colors.accentCyan }]}>Mark paid</Text>
          </Pill>
        </Pressable>
      ) : (
        <Text style={[styles.rowAmt, { color: incoming ? colors.accentMint : colors.textPrimary }]}>
          {incoming ? "+ " : "- "}{formatMoney(money(tx.amountMinor))}
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  monthLabel: { fontFamily: fonts.display, fontSize: 16 },
  weekRow: { flexDirection: "row" },
  weekday: { width: `${100 / 7}%`, textAlign: "center", fontFamily: fonts.semibold, fontSize: 11 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 5, gap: 3 },
  dayCircle: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  dayNum: { fontFamily: fonts.medium, fontSize: 14 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  section: { fontFamily: fonts.display, fontSize: 17, marginTop: 4 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  rowIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowName: { fontFamily: fonts.semibold, fontSize: 14 },
  rowAmt: { fontFamily: fonts.displayBold, fontSize: 14 },
  payText: { fontFamily: fonts.semibold, fontSize: 11 },
});
