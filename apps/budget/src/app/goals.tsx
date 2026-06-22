import { formatMoney, money, type GoalDto, type NewGoalInput } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProgressRing } from "../components/Decor";
import { Field, SheetButton, toMinor } from "../components/forms";
import { GlassCard } from "../components/GlassCard";
import { Icon, Pill, ProgressBar } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { Sheet } from "../components/Sheet";
import { api } from "../lib/api";
import { useTheme } from "../theme";

export default function GoalsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["goals"], queryFn: () => api.listGoals() });
  const goals = q.data?.goals ?? [];

  const totalSaved = goals.reduce((s, g) => s + g.savedMinor, 0);
  const totalTarget = goals.reduce((s, g) => s + g.targetMinor, 0);
  const overall = totalTarget > 0 ? totalSaved / totalTarget : 0;
  const onTrack = goals.filter((g) => g.targetMinor > 0 && g.savedMinor / g.targetMinor >= 0.5).length;

  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [deadline, setDeadline] = useState("");

  const [contribFor, setContribFor] = useState<GoalDto | null>(null);
  const [amount, setAmount] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["goals"] });
    qc.invalidateQueries({ queryKey: ["summary"] });
  };

  const create = useMutation({
    mutationFn: (input: NewGoalInput) => api.createGoal(input),
    onSuccess: () => { invalidate(); setCreateOpen(false); setName(""); setTarget(""); setDeadline(""); },
  });
  const contribute = useMutation({
    mutationFn: ({ id, amountMinor }: { id: string; amountMinor: number }) => api.contributeGoal(id, amountMinor),
    onSuccess: () => { invalidate(); setContribFor(null); setAmount(""); },
  });

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.back, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Goals</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setCreateOpen(true)} style={[styles.newBtn, { backgroundColor: colors.accentCyan }]}>
              <Icon name="add" size={18} color={colors.onAccent} />
              <Text style={[styles.newText, { color: colors.onAccent }]}>New goal</Text>
            </Pressable>
          </View>

          {q.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : goals.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="flag" size={26} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No goals yet</Text>
              <Text style={[styles.muted, { color: colors.textMuted }]}>Create one to start saving with a plan</Text>
            </GlassCard>
          ) : (
            <>
              <GlassCard style={styles.overview}>
                <ProgressRing size={78} strokeWidth={8} progress={overall} color={colors.accentMint} track={colors.trackBg}>
                  <Text style={[styles.ringPct, { color: colors.textPrimary }]}>{Math.round(overall * 100)}%</Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={[styles.ovLabel, { color: colors.textSecondary }]}>TOTAL SAVED</Text>
                  <Text style={[styles.ovValue, { color: colors.textPrimary }]}>{formatMoney(money(totalSaved))}</Text>
                  <Pill bg={colors.tintGreen} style={{ alignSelf: "flex-start" }}>
                    <Icon name="check-circle" size={13} color={colors.accentMint} />
                    <Text style={[styles.ovChip, { color: colors.accentMint }]}>{onTrack} of {goals.length} on track</Text>
                  </Pill>
                </View>
              </GlassCard>
              {goals.map((g) => <GoalCard key={g.id} goal={g} onContribute={() => setContribFor(g)} />)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="New savings goal">
        <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. MacBook for work" />
        <Field label="TARGET AMOUNT (GHS)" value={target} onChangeText={setTarget} placeholder="9000" keyboardType="decimal-pad" />
        <Field label="TARGET DATE (optional)" value={deadline} onChangeText={setDeadline} placeholder="2026-12-01" />
        <SheetButton
          label="Create goal"
          busy={create.isPending}
          disabled={!name.trim() || toMinor(target) <= 0}
          onPress={() => create.mutate({ name: name.trim(), icon: "savings", targetMinor: toMinor(target), deadline: deadline.trim() || undefined })}
        />
      </Sheet>

      <Sheet visible={contribFor !== null} onClose={() => setContribFor(null)} title={`Add to ${contribFor?.name ?? "goal"}`}>
        <Field label="AMOUNT (GHS)" value={amount} onChangeText={setAmount} placeholder="500" keyboardType="decimal-pad" />
        <SheetButton
          label="Add contribution"
          busy={contribute.isPending}
          disabled={toMinor(amount) <= 0}
          onPress={() => contribFor && contribute.mutate({ id: contribFor.id, amountMinor: toMinor(amount) })}
        />
      </Sheet>
    </ScreenBackground>
  );
}

function GoalCard({ goal, onContribute }: { goal: GoalDto; onContribute: () => void }) {
  const { colors } = useTheme();
  const ratio = goal.targetMinor > 0 ? Math.min(goal.savedMinor / goal.targetMinor, 1) : 0;
  return (
    <GlassCard style={{ gap: 13 }}>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.tintGreen }]}>
          <Icon name={(goal.icon as never) || "flag"} size={24} color={colors.accentMint} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{goal.name}</Text>
          {goal.deadline ? <Text style={[styles.muted, { color: colors.textMuted }]}>by {goal.deadline}</Text> : null}
        </View>
        <Text style={[styles.pct, { color: colors.accentMint }]}>{Math.round(ratio * 100)}%</Text>
      </View>
      <ProgressBar value={ratio} color={colors.accentMint} />
      <View style={styles.row}>
        <Text style={[styles.amt, { color: colors.textPrimary }]}>
          {formatMoney(money(goal.savedMinor))} / {formatMoney(money(goal.targetMinor), { withCode: false })}
        </Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={onContribute}>
          <Pill bg={colors.tintTealStrong}>
            <Icon name="add" size={14} color={colors.accentCyan} />
            <Text style={[styles.chipText, { color: colors.accentCyan }]}>Add</Text>
          </Pill>
        </Pressable>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20, fontWeight: "600" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 8, paddingHorizontal: 13, borderRadius: radius.pill },
  newText: { fontFamily: fonts.semibold, fontSize: 13 },
  overview: { flexDirection: "row", alignItems: "center", gap: 16 },
  ringPct: { fontFamily: fonts.displayBold, fontSize: 18 },
  ovLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1 },
  ovValue: { fontFamily: fonts.displayBold, fontSize: 26 },
  ovChip: { fontFamily: fonts.semibold, fontSize: 11 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  name: { fontFamily: fonts.semibold, fontSize: 15 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  pct: { fontFamily: fonts.displayBold, fontSize: 20, fontWeight: "700" },
  amt: { fontFamily: fonts.medium, fontSize: 13 },
  chipText: { fontFamily: fonts.semibold, fontSize: 11 },
});
