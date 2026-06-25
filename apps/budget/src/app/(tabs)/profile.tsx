import { fonts, radius } from "@okes/ui";
import { useQuery } from "@tanstack/react-query";
import { useRouter, type Href } from "expo-router";
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../auth/AuthContext";
import { GlassCard } from "../../components/GlassCard";
import { Icon, Pill, ProgressBar } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const SETTINGS: { icon: string; label: string; route: Href }[] = [
  { icon: "notifications", label: "Notifications", route: "/settings/notifications" },
  { icon: "security", label: "Privacy & security", route: "/settings/security" },
  { icon: "category", label: "Categories", route: "/categories" },
  { icon: "account-balance-wallet", label: "Linked wallets", route: "/wallets" },
  { icon: "payments", label: "Currency", route: "/settings/currency" },
  { icon: "ios-share", label: "Export data", route: "/settings/export" },
  { icon: "help", label: "Help & support", route: "/settings/help" },
];

export default function ProfileScreen() {
  const { colors, mode, toggle } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuth();
  const q = useQuery({ queryKey: ["profile"], queryFn: () => api.getProfile() });
  const p = q.data?.profile;

  const xpRatio = p ? Math.min(p.xp / Math.max(p.xpToNext, 1), 1) : 0;

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>Profile</Text>
            <Pressable onPress={() => router.push("/settings/notifications")} style={[styles.gear, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="settings" size={21} color={colors.textSecondary} />
            </Pressable>
          </View>

          <GlassCard bright style={{ gap: 16 }}>
            <View style={styles.rankRow}>
              <View style={[styles.avatar, { backgroundColor: colors.accentCyan }]}>
                <Text style={[styles.avatarText, { color: colors.onAccent }]}>
                  {p?.initial ?? user?.name?.charAt(0).toUpperCase() ?? "?"}
                </Text>
              </View>
              <View style={{ flex: 1, gap: 5 }}>
                <Text style={[styles.name, { color: colors.textPrimary }]}>{user?.name ?? "—"}</Text>
                <Pill bg={colors.tintGold} style={{ alignSelf: "flex-start" }}>
                  <Icon name="military-tech" size={14} color={colors.accentAmber} />
                  <Text style={[styles.rank, { color: colors.accentAmber }]}>
                    {p ? `${p.rank} · Lv ${p.level}` : "…"}
                  </Text>
                </Pill>
              </View>
            </View>
            <View style={{ gap: 7 }}>
              <View style={styles.rowBetween}>
                <Text style={[styles.muted, { color: colors.textSecondary }]}>
                  {p ? `${p.xp} / ${p.xpToNext} XP` : "—"}
                </Text>
                <Text style={[styles.mutedStrong, { color: colors.accentViolet }]}>Next rank</Text>
              </View>
              <ProgressBar value={xpRatio} color={colors.accentViolet} />
            </View>
          </GlassCard>

          <View style={styles.stats}>
            {[
              { icon: "local-fire-department", v: p?.streakDays ?? 0, l: "day streak", c: colors.accentAmber, b: colors.tintGold },
              { icon: "bolt", v: p?.level ?? 1, l: "level", c: colors.accentCyan, b: colors.tintTeal },
              { icon: "star", v: p?.xp ?? 0, l: "total XP", c: colors.accentMint, b: colors.tintGreen },
            ].map((s) => (
              <GlassCard key={s.l} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.b }]}>
                  <Icon name={s.icon as never} size={19} color={s.c} />
                </View>
                <Text style={[styles.statV, { color: colors.textPrimary }]}>{s.v}</Text>
                <Text style={[styles.statL, { color: colors.textMuted }]}>{s.l}</Text>
              </GlassCard>
            ))}
          </View>

          {q.isLoading && <ActivityIndicator color={colors.accentCyan} />}

          <GlassCard style={{ padding: 6, gap: 2 }}>
            <Pressable style={styles.settingRow} onPress={toggle}>
              <View style={[styles.settingIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                <Icon name={mode === "dark" ? "dark-mode" : "light-mode"} size={19} color={colors.accentCyan} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>
                Appearance · {mode === "dark" ? "Dark" : "Light"}
              </Text>
              <View style={[styles.tgl, { backgroundColor: mode === "light" ? colors.accentCyan : colors.trackBg, justifyContent: mode === "light" ? "flex-end" : "flex-start" }]}>
                <View style={styles.knob} />
              </View>
            </Pressable>
            {SETTINGS.map((s) => (
              <Pressable key={s.label} style={styles.settingRow} onPress={() => router.push(s.route)}>
                <View style={[styles.settingIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                  <Icon name={s.icon as never} size={19} color={colors.textSecondary} />
                </View>
                <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>{s.label}</Text>
                <Icon name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            ))}
            <Pressable style={styles.settingRow} onPress={() => Linking.openURL("market://details?id=com.okes.app").catch(() => Linking.openURL("https://play.google.com/store/apps/details?id=com.okes.app"))}>
              <View style={[styles.settingIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                <Icon name="star-rate" size={19} color={colors.accentAmber} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Rate Okes</Text>
              <Icon name="chevron-right" size={20} color={colors.textMuted} />
            </Pressable>
            <Pressable style={styles.settingRow} onPress={() => logout()}>
              <View style={[styles.settingIcon, { backgroundColor: colors.tintClay }]}>
                <Icon name="logout" size={19} color={colors.accentPink} />
              </View>
              <Text style={[styles.settingLabel, { color: colors.accentPink }]}>Sign out</Text>
            </Pressable>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 16 },
  title: { fontFamily: fonts.display, fontSize: 24 },
  topBar: { flexDirection: "row", alignItems: "center" },
  gear: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  rankRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 22, fontWeight: "700" },
  name: { fontFamily: fonts.displayBold, fontSize: 20, fontWeight: "700" },
  rank: { fontFamily: fonts.bold, fontSize: 12 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  mutedStrong: { fontFamily: fonts.semibold, fontSize: 12 },
  stats: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, alignItems: "center", gap: 6, padding: 14 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  statV: { fontFamily: fonts.displayBold, fontSize: 18, fontWeight: "700" },
  statL: { fontFamily: fonts.body, fontSize: 11 },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 10, borderRadius: 14 },
  settingIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  settingLabel: { flex: 1, fontFamily: fonts.medium, fontSize: 14 },
  tgl: { width: 46, height: 27, borderRadius: 100, padding: 3, flexDirection: "row", alignItems: "center" },
  knob: { width: 21, height: 21, borderRadius: 100, backgroundColor: "#f2f4f8" },
});
