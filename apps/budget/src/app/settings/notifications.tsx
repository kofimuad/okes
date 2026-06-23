import { fonts } from "@okes/ui";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Toggle } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useTheme } from "../../theme";

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [push, setPush] = useState(true);
  const [caps, setCaps] = useState(true);
  const [summary, setSummary] = useState(true);
  const [crew, setCrew] = useState(false);

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
            <Toggle label="Push notifications" value={push} onChange={setPush} />
            <Toggle label="Spending cap alerts" value={caps} onChange={setCaps} />
            <Toggle label="Weekly money summary" value={summary} onChange={setSummary} />
            <Toggle label="Crew activity" value={crew} onChange={setCrew} />
          </GlassCard>

          <View style={[styles.note, { backgroundColor: colors.tintTeal, borderColor: colors.hairline }]}>
            <Icon name="info" size={16} color={colors.accentCyan} />
            <Text style={[styles.noteText, { color: colors.textSecondary }]}>
              Delivery switches on with the upcoming notifications update. Your preferences are saved here until then.
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
