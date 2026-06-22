import { fonts, radius } from "@okes/ui";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Pill } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useTheme } from "../../theme";

const PLAN_STEPS = [
  "Set aside GHS 570 every week",
  "Trim Food cap by GHS 150/mo (+450)",
  "Auto-route side-hustle income to Vault",
];
const SUGGESTIONS = [
  { icon: "payments", label: "Cut spending" },
  { icon: "event", label: "Plan payday" },
  { icon: "rocket-launch", label: "Save faster" },
] as const;

export default function CoachScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          {/* Top bar */}
          <View style={styles.topBar}>
            <Pressable onPress={() => router.push("/")} style={[styles.circle, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>NOVA Coach</Text>
            <View style={[styles.circle, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="history" size={22} color={colors.textSecondary} />
            </View>
          </View>

          {/* Companion orb */}
          <View style={styles.orbWrap}>
            <View style={[styles.ring1, { backgroundColor: colors.tintTeal }]}>
              <View style={[styles.ring2, { backgroundColor: colors.tintViolet }]}>
                <View style={[styles.core, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairlineBright }]}>
                  <Icon name="smart-toy" size={30} color={colors.accentCyan} />
                </View>
              </View>
            </View>
            <View style={styles.status}>
              <View style={[styles.dot, { backgroundColor: colors.accentMint }]} />
              <Text style={[styles.statusText, { color: colors.textSecondary }]}>Online · reads your live data</Text>
            </View>
          </View>

          {/* Chat thread */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 8 }}>
            <Bubble side="ai">Morning, Kwame 👋 Your runway is 42 days — solid. But Food & Dining is at 88% with 9 days left in this cycle.</Bubble>
            <Bubble side="user">How do I save for the MacBook by December?</Bubble>

            {/* AI plan card */}
            <View style={styles.aiRow}>
              <View style={[styles.planCard, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairlineBright }]}>
                <View style={styles.planHead}>
                  <View style={[styles.planIcon, { backgroundColor: colors.tintTeal }]}>
                    <Icon name="flag" size={16} color={colors.accentCyan} />
                  </View>
                  <Text style={[styles.planTitle, { color: colors.textPrimary }]}>Your MacBook plan</Text>
                </View>
                <Text style={[styles.planIntro, { color: colors.textSecondary }]}>Here's how you reach GHS 9,000 by Dec 12:</Text>
                {PLAN_STEPS.map((s, i) => (
                  <View key={s} style={styles.step}>
                    <View style={[styles.stepNum, { backgroundColor: colors.tintTeal }]}>
                      <Text style={[styles.stepNumText, { color: colors.accentCyan }]}>{i + 1}</Text>
                    </View>
                    <Text style={[styles.stepText, { color: colors.textPrimary }]}>{s}</Text>
                  </View>
                ))}
                <View style={styles.planFoot}>
                  <Pill bg={colors.tintGreen}>
                    <Icon name="check-circle" size={13} color={colors.accentMint} />
                    <Text style={[styles.footText, { color: colors.accentMint }]}>On track · Dec 12</Text>
                  </Pill>
                  <Pill bg={colors.tintViolet}>
                    <Text style={[styles.footText, { color: colors.accentViolet }]}>86% confidence</Text>
                  </Pill>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Suggestions */}
          <View style={styles.chips}>
            {SUGGESTIONS.map((s) => (
              <Pill key={s.label} bg={colors.surfaceGlass} style={{ paddingVertical: 9, paddingHorizontal: 13, borderWidth: 1, borderColor: colors.hairline }}>
                <Icon name={s.icon as never} size={15} color={colors.accentCyan} />
                <Text style={[styles.chipText, { color: colors.textSecondary }]}>{s.label}</Text>
              </Pill>
            ))}
          </View>

          {/* Input bar */}
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 84 }]}>
            <View style={[styles.field, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Text style={[styles.placeholder, { color: colors.textMuted }]}>Ask NOVA anything…</Text>
              <Icon name="mic" size={20} color={colors.textSecondary} />
            </View>
            <View style={[styles.send, { backgroundColor: colors.accentCyan }]}>
              <Icon name="send" size={22} color={colors.onAccent} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function Bubble({ side, children }: { side: "ai" | "user"; children: ReactNode }) {
  const { colors } = useTheme();
  const ai = side === "ai";
  return (
    <View style={[styles.bubbleRow, { justifyContent: ai ? "flex-start" : "flex-end" }]}>
      <View
        style={[
          styles.bubble,
          ai
            ? { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline, borderBottomLeftRadius: 4 }
            : { backgroundColor: colors.tintTealStrong, borderColor: colors.hairlineBright, borderBottomRightRadius: 4 },
        ]}
      >
        <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>{children}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 2 },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontFamily: fonts.display, fontSize: 20 },
  orbWrap: { alignItems: "center", gap: 10, paddingVertical: 14 },
  ring1: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  ring2: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  core: { width: 60, height: 60, borderRadius: 30, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  status: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: fonts.body, fontSize: 12 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: 290, borderWidth: 1, borderRadius: 18, padding: 14 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  aiRow: { flexDirection: "row", justifyContent: "flex-start" },
  planCard: { width: 300, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, padding: 16, gap: 12 },
  planHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  planIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  planTitle: { fontFamily: fonts.display, fontSize: 14 },
  planIntro: { fontFamily: fonts.body, fontSize: 13, lineHeight: 19 },
  step: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  stepNumText: { fontFamily: fonts.displayBold, fontSize: 12 },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 13 },
  planFoot: { flexDirection: "row", gap: 8, alignItems: "center", paddingTop: 2 },
  footText: { fontFamily: fonts.semibold, fontSize: 11 },
  chips: { flexDirection: "row", gap: 8, paddingVertical: 12, justifyContent: "center" },
  chipText: { fontFamily: fonts.medium, fontSize: 12 },
  inputBar: { flexDirection: "row", gap: 10, alignItems: "center" },
  field: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 13, paddingHorizontal: 16, borderRadius: radius.pill, borderWidth: 1 },
  placeholder: { fontFamily: fonts.body, fontSize: 14 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
