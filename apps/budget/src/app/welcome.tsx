import { fonts, radius } from "@okes/ui";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon, Pill } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { useTheme } from "../theme";

const FEATURES = [
  { icon: "autorenew", label: "Auto-track", key: "mint" },
  { icon: "psychology", label: "AI Coach", key: "violet" },
  { icon: "groups", label: "Crew goals", key: "amber" },
] as const;

export default function WelcomeScreen() {
  const { colors, mode, toggle } = useTheme();
  const router = useRouter();
  const accent: Record<string, string> = { mint: colors.accentMint, violet: colors.accentViolet, amber: colors.accentAmber };
  const tint: Record<string, string> = { mint: colors.tintGreen, violet: colors.tintViolet, amber: colors.tintGold };

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.top}>
          <View style={styles.brand}>
            <Icon name="rocket-launch" size={20} color={colors.accentCyan} />
            <Text style={[styles.wordmark, { color: colors.textPrimary }]}>Okes</Text>
          </View>
          <Pressable onPress={toggle} hitSlop={10}>
            <Icon name={mode === "dark" ? "light-mode" : "dark-mode"} size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.hero}>
          <View style={[styles.orbOuter, { backgroundColor: colors.tintTeal }]}>
            <View style={[styles.orbMid, { backgroundColor: colors.tintViolet }]}>
              <View style={[styles.orbCore, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairlineBright }]}>
                <Icon name="smart-toy" size={40} color={colors.accentCyan} />
              </View>
            </View>
          </View>

          <Text style={[styles.headline, { color: colors.textPrimary }]}>Command your money & missions</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Auto-track MoMo & bank, get AI savings coaching, and level up with your trusted crew.
          </Text>

          <View style={styles.features}>
            {FEATURES.map((f) => (
              <Pill key={f.label} bg={tint[f.key]} style={{ paddingVertical: 9, paddingHorizontal: 13 }}>
                <Icon name={f.icon as never} size={15} color={accent[f.key]} />
                <Text style={[styles.featText, { color: colors.textSecondary }]}>{f.label}</Text>
              </Pill>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable style={[styles.primary, { backgroundColor: colors.accentCyan }]} onPress={() => router.push("/login")}>
            <Text style={[styles.primaryText, { color: colors.onAccent }]}>Create your account</Text>
            <Icon name="arrow-forward" size={19} color={colors.onAccent} />
          </Pressable>
          <Pressable onPress={() => router.push("/login")} style={{ alignItems: "center", paddingVertical: 6 }}>
            <Text style={[styles.signin, { color: colors.textMuted }]}>
              Already have an account? <Text style={{ color: colors.accentCyan, fontFamily: fonts.bold }}>Sign in</Text>
            </Text>
          </Pressable>
          <Text style={[styles.region, { color: colors.textMuted }]}>🇬🇭 Built for Ghana & Africa</Text>
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 24, paddingTop: 8 },
  brand: { flexDirection: "row", alignItems: "center", gap: 8 },
  wordmark: { fontFamily: fonts.displayBold, fontSize: 20, fontWeight: "700", letterSpacing: 2 },
  hero: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 28, gap: 18 },
  orbOuter: { width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center" },
  orbMid: { width: 102, height: 102, borderRadius: 51, alignItems: "center", justifyContent: "center" },
  orbCore: { width: 74, height: 74, borderRadius: 37, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  headline: { fontFamily: fonts.displayBold, fontSize: 28, fontWeight: "700", textAlign: "center", lineHeight: 34 },
  sub: { fontFamily: fonts.body, fontSize: 15, textAlign: "center", lineHeight: 22 },
  features: { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  featText: { fontFamily: fonts.semibold, fontSize: 12 },
  actions: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  primary: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, paddingVertical: 16, borderRadius: radius.pill },
  primaryText: { fontFamily: fonts.bold, fontSize: 15 },
  signin: { fontFamily: fonts.body, fontSize: 13 },
  region: { fontFamily: fonts.body, fontSize: 12, textAlign: "center" },
});
