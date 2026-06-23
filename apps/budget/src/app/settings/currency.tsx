import { fonts } from "@okes/ui";
import { useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { useTheme } from "../../theme";

const CURRENCIES = [
  { code: "GHS", name: "Ghanaian Cedi", symbol: "₵" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
];

export default function CurrencyScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const active = "GHS";

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Currency</Text>
          </View>

          <GlassCard style={{ padding: 6, gap: 2 }}>
            {CURRENCIES.map((c) => {
              const on = c.code === active;
              return (
                <Pressable
                  key={c.code}
                  style={styles.row}
                  onPress={() => !on && Alert.alert("Coming soon", "Multi-currency support is on the way. Okes runs in Cedis for now.")}
                >
                  <View style={[styles.sym, { backgroundColor: colors.surfaceGlassStrong }]}>
                    <Text style={[styles.symText, { color: on ? colors.accentCyan : colors.textSecondary }]}>{c.symbol}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.code, { color: colors.textPrimary }]}>{c.code}</Text>
                    <Text style={[styles.name, { color: colors.textMuted }]}>{c.name}</Text>
                  </View>
                  {on && <Icon name="check-circle" size={20} color={colors.accentMint} />}
                </Pressable>
              );
            })}
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
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 11, paddingHorizontal: 10 },
  sym: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  symText: { fontFamily: fonts.displayBold, fontSize: 16 },
  code: { fontFamily: fonts.semibold, fontSize: 14 },
  name: { fontFamily: fonts.body, fontSize: 12 },
});
