import { fonts } from "@okes/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Field, SheetButton, Toggle } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { PinPad } from "../../components/PinPad";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Sheet } from "../../components/Sheet";
import { api } from "../../lib/api";
import { biometricAvailable, lockSettings } from "../../lib/lock";
import { useTheme } from "../../theme";

export default function SecurityScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  // app lock
  const [lockEnabled, setLockEnabled] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioAvail, setBioAvail] = useState(false);
  const [pinSheet, setPinSheet] = useState(false);
  const [firstPin, setFirstPin] = useState<string | null>(null);
  const [pinErr, setPinErr] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await lockSettings.get();
      setLockEnabled(s.enabled);
      setBioOn(s.bio);
      setBioAvail(await biometricAvailable());
    })();
  }, []);

  const onToggleLock = async (v: boolean) => {
    if (v) { setFirstPin(null); setPinErr(false); setPinSheet(true); }
    else { await lockSettings.disable(); setLockEnabled(false); setBioOn(false); }
  };
  const onPin = async (pin: string) => {
    if (firstPin === null) { setFirstPin(pin); return; }
    if (pin === firstPin) {
      await lockSettings.setPin(pin);
      setLockEnabled(true); setPinSheet(false); setFirstPin(null); setPinErr(false);
      Alert.alert("App lock on", "You'll need this passcode to open Okes.");
    } else {
      setPinErr(true); setFirstPin(null);
    }
  };
  const onToggleBio = async (v: boolean) => { await lockSettings.setBio(v); setBioOn(v); };

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
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
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

          <GlassCard style={{ gap: 14 }}>
            <Text style={[styles.section, { color: colors.textPrimary }]}>App lock</Text>
            <Toggle label="Require passcode to open" value={lockEnabled} onChange={onToggleLock} />
            {lockEnabled && bioAvail && <Toggle label="Unlock with fingerprint / face" value={bioOn} onChange={onToggleBio} />}
            {lockEnabled && (
              <Pressable onPress={() => { setFirstPin(null); setPinErr(false); setPinSheet(true); }}>
                <Text style={[styles.link, { color: colors.accentCyan }]}>Change passcode</Text>
              </Pressable>
            )}
          </GlassCard>
        </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Sheet visible={pinSheet} onClose={() => { setPinSheet(false); setFirstPin(null); }} title={firstPin === null ? "Set a passcode" : "Confirm passcode"}>
        <Text style={[styles.pinHint, { color: pinErr ? colors.accentPink : colors.textSecondary }]}>
          {pinErr ? "Passcodes didn't match — try again" : firstPin === null ? "Choose a 4-digit passcode" : "Re-enter to confirm"}
        </Text>
        <PinPad onComplete={onPin} error={pinErr} />
      </Sheet>
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
  link: { fontFamily: fonts.semibold, fontSize: 14 },
  pinHint: { fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginBottom: 8 },
});
