import { useQuery } from "@tanstack/react-query";
import { fonts } from "@okes/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { api } from "../../lib/api";
import { exportCsv, exportPdf } from "../../lib/export";
import { useTheme } from "../../theme";

export default function ExportScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const q = useQuery({ queryKey: ["transactions", "all"], queryFn: () => api.listTransactions({ limit: 200 }) });
  const txns = q.data?.transactions ?? [];
  const [busy, setBusy] = useState<"csv" | "pdf" | null>(null);

  const run = async (kind: "csv" | "pdf") => {
    if (txns.length === 0) { Alert.alert("Nothing to export", "Add some transactions first."); return; }
    setBusy(kind);
    try {
      if (kind === "csv") await exportCsv(txns);
      else await exportPdf(txns);
    } catch (e) {
      Alert.alert("Export failed", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(null);
    }
  };

  const Btn = ({ kind, icon, label, hint }: { kind: "csv" | "pdf"; icon: string; label: string; hint: string }) => (
    <Pressable onPress={() => run(kind)} disabled={busy !== null}>
      <GlassCard style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.tintTeal }]}>
          {busy === kind ? <ActivityIndicator color={colors.accentCyan} /> : <Icon name={icon as never} size={22} color={colors.accentCyan} />}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[styles.hint, { color: colors.textMuted }]}>{hint}</Text>
        </View>
        <Icon name="ios-share" size={20} color={colors.textMuted} />
      </GlassCard>
    </Pressable>
  );

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Export data</Text>
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>Export your latest {txns.length} transactions to share or back up.</Text>
          <Btn kind="csv" icon="table-chart" label="Export as CSV" hint="Spreadsheet-friendly" />
          <Btn kind="pdf" icon="picture-as-pdf" label="Export as PDF" hint="Printable statement" />

          <View style={[styles.note, { backgroundColor: colors.tintTeal, borderColor: colors.hairline }]}>
            <Icon name="info" size={16} color={colors.accentCyan} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>Importing data is coming soon.</Text>
          </View>
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
  icon: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  label: { fontFamily: fonts.semibold, fontSize: 15 },
  hint: { fontFamily: fonts.body, fontSize: 12 },
  note: { flexDirection: "row", gap: 10, padding: 14, borderRadius: 16, borderWidth: 1, marginTop: 4 },
  noteText: { flex: 1, fontFamily: fonts.body, fontSize: 12 },
});
