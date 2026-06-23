import { fonts } from "@okes/ui";
import { useRouter } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useTheme } from "../../theme";

const LINKS: { icon: string; label: string; action: () => void }[] = [
  { icon: "mail", label: "Contact support", action: () => Linking.openURL("mailto:hello@okes.app") },
  { icon: "description", label: "Privacy policy", action: () => Linking.openURL("https://okes.app/privacy") },
  { icon: "gavel", label: "Terms of service", action: () => Linking.openURL("https://okes.app/terms") },
];

export default function HelpScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Help & support</Text>
          </View>

          <GlassCard style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
            <View style={[styles.logo, { backgroundColor: colors.tintTeal }]}>
              <Icon name="rocket-launch" size={28} color={colors.accentCyan} />
            </View>
            <Text style={[styles.brand, { color: colors.textPrimary }]}>Okes</Text>
            <Text style={[styles.muted, { color: colors.textMuted }]}>Your money, in orbit · v1.0.0</Text>
          </GlassCard>

          <GlassCard style={{ padding: 6, gap: 2 }}>
            {LINKS.map((l) => (
              <Pressable key={l.label} style={styles.row} onPress={l.action}>
                <View style={[styles.icon, { backgroundColor: colors.surfaceGlassStrong }]}>
                  <Icon name={l.icon as never} size={19} color={colors.textSecondary} />
                </View>
                <Text style={[styles.label, { color: colors.textPrimary }]}>{l.label}</Text>
                <Icon name="open-in-new" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </GlassCard>
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
  logo: { width: 56, height: 56, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  brand: { fontFamily: fonts.displayBold, fontSize: 22 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 10 },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontFamily: fonts.medium, fontSize: 14 },
});
