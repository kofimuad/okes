import type { NotifPrefs } from "@okes/core";
import { fonts } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toggle } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const KEY = ["notifPrefs"];

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: KEY, queryFn: () => api.getNotifPrefs() });
  const prefs = q.data?.prefs;

  const update = useMutation({
    mutationFn: (patch: Partial<NotifPrefs>) => api.updateNotifPrefs(patch),
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<{ prefs: NotifPrefs }>(KEY);
      if (prev) qc.setQueryData(KEY, { prefs: { ...prev.prefs, ...patch } });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(KEY, ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const val = (k: keyof NotifPrefs) => prefs?.[k] ?? (k === "crew" ? false : true);
  const set = (k: keyof NotifPrefs) => (v: boolean) => update.mutate({ [k]: v });

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Notifications</Text>
          </View>

          <GlassCard style={{ gap: 16 }}>
            <Toggle label="Push notifications" value={val("push")} onChange={set("push")} />
            <Toggle label="Spending cap alerts" value={val("caps")} onChange={set("caps")} />
            <Toggle label="Weekly money summary" value={val("summary")} onChange={set("summary")} />
            <Toggle label="Crew activity" value={val("crew")} onChange={set("crew")} />
          </GlassCard>

          <View style={[styles.note, { backgroundColor: colors.tintTeal, borderColor: colors.hairline }]}>
            <Icon name="info" size={16} color={colors.accentCyan} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Turn on push to get cap alerts and approval updates on this device. You can grant the system permission when prompted.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  note: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1 },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12, lineHeight: 18 },
});
