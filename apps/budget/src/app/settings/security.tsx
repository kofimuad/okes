import { fonts } from "@okes/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field, SheetButton } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

export default function SecurityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const change = useMutation({
    mutationFn: () => api.changePassword(current, next),
    onSuccess: () => {
      Alert.alert("Password changed", "Use your new password next time you sign in.");
      setCurrent(""); setNext(""); setConfirm("");
      router.back();
    },
    onError: (e) => Alert.alert("Couldn't change password", e instanceof Error ? e.message : "Try again."),
  });

  const mismatch = confirm.length > 0 && next !== confirm;
  const valid = current.length > 0 && next.length >= 8 && next === confirm;

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Privacy & security</Text>
          </View>

          <GlassCard style={{ gap: 14 }}>
            <Text style={[styles.section, { color: colors.textPrimary }]}>Change password</Text>
            <Field label="CURRENT PASSWORD" value={current} onChangeText={setCurrent} secureTextEntry placeholder="••••••••" />
            <Field label="NEW PASSWORD" value={next} onChangeText={setNext} secureTextEntry placeholder="At least 8 characters" />
            <Field label="CONFIRM NEW PASSWORD" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="••••••••" />
            {mismatch && <Text style={[styles.err, { color: colors.accentPink }]}>Passwords don't match</Text>}
            <SheetButton label="Update password" busy={change.isPending} disabled={!valid} onPress={() => change.mutate()} />
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
  section: { fontFamily: fonts.display, fontSize: 16 },
  err: { fontFamily: fonts.medium, fontSize: 12, marginTop: -4 },
});
