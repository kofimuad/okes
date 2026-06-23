import { formatMoney, money } from "@okes/core";
import { fonts } from "@okes/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../components/GlassCard";
import { Icon, ProgressBar } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { api } from "../lib/api";
import { useTheme } from "../theme";

export default function AlertsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const capsQ = useQuery({ queryKey: ["caps"], queryFn: () => api.listCaps() });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
  const aprQ = useQuery({ queryKey: ["approvals"], queryFn: () => api.listApprovals() });

  const catName = (id: string) => catsQ.data?.categories.find((c) => c.id === id)?.name ?? "Category";
  const flaggedCaps = (capsQ.data?.caps ?? []).filter((c) => c.status !== "on_track");
  const pending = (aprQ.data?.approvals ?? []).filter((a) => a.status === "pending");
  const loading = capsQ.isLoading || aprQ.isLoading;
  const empty = !loading && flaggedCaps.length === 0 && pending.length === 0;

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Alerts</Text>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : empty ? (
            <GlassCard style={{ alignItems: "center", gap: 8, paddingVertical: 28 }}>
              <Icon name="check-circle" size={30} color={colors.accentMint} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>You're all clear</Text>
              <Text style={[styles.muted, { color: colors.textMuted }]}>No caps near their limit, no pending approvals.</Text>
            </GlassCard>
          ) : (
            <>
              {pending.map((a) => (
                <Pressable key={a.id} onPress={() => router.push("/crew")}>
                  <GlassCard tint={colors.tintClay} style={styles.row}>
                    <View style={[styles.icon, { backgroundColor: colors.surfaceGlassStrong }]}>
                      <Icon name="gpp-maybe" size={22} color={colors.accentPink} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>Approval pending</Text>
                      <Text style={[styles.muted, { color: colors.textSecondary }]}>{formatMoney(money(a.amountMinor))} · {a.reason}</Text>
                    </View>
                    <Icon name="chevron-right" size={20} color={colors.textMuted} />
                  </GlassCard>
                </Pressable>
              ))}
              {flaggedCaps.map((c) => {
                const over = c.status === "over";
                const col = over ? colors.accentPink : colors.accentAmber;
                const ratio = c.limitMinor > 0 ? c.spentMinor / c.limitMinor : 0;
                return (
                  <Pressable key={c.id} onPress={() => router.push("/caps")}>
                    <GlassCard style={styles.capCard}>
                      <View style={styles.capTop}>
                        <View style={[styles.icon, { backgroundColor: over ? colors.tintClay : colors.tintGold }]}>
                          <Icon name="warning" size={20} color={col} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[styles.rowTitle, { color: colors.textPrimary }]}>{catName(c.categoryId)} {over ? "over budget" : "nearing cap"}</Text>
                          <Text style={[styles.muted, { color: colors.textSecondary }]}>
                            {over
                              ? `Over by ${formatMoney(money(c.spentMinor - c.limitMinor))}`
                              : `${formatMoney(money(c.limitMinor - c.spentMinor))} left of ${formatMoney(money(c.limitMinor), { withCode: false })}`}
                          </Text>
                        </View>
                      </View>
                      <ProgressBar value={ratio} color={col} height={6} />
                    </GlassCard>
                  </Pressable>
                );
              })}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  capCard: { gap: 10 },
  capTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  rowTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
});
