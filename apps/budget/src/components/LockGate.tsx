import { fonts } from "@okes/ui";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, AppState, StyleSheet, Text, View } from "react-native";
import { biometricAuth, biometricAvailable, lockSettings } from "../lib/lock";
import { useTheme } from "../theme";
import { Icon } from "./primitives";
import { PinPad } from "./PinPad";

export function LockGate({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const [ready, setReady] = useState(false);
  const [bio, setBio] = useState(false);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await lockSettings.get();
      setBio(s.bio && (await biometricAvailable()));
      setLocked(s.enabled);
      setReady(true);
    })();
  }, []);

  // Re-lock whenever the app goes to the background.
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (st) => {
      if (st === "background" || st === "inactive") {
        const s = await lockSettings.get();
        if (s.enabled) setLocked(true);
      }
    });
    return () => sub.remove();
  }, []);

  const tryBio = async () => {
    if (await biometricAuth()) { setError(false); setLocked(false); }
  };

  // Offer biometrics automatically whenever the lock screen appears.
  useEffect(() => {
    if (locked && bio) tryBio();
  }, [locked, bio]);

  const submit = async (pin: string) => {
    if (await lockSettings.checkPin(pin)) { setError(false); setLocked(false); }
    else setError(true);
  };

  if (!ready) {
    return <View style={[styles.full, { backgroundColor: colors.bgDeep }]}><ActivityIndicator color={colors.accentCyan} /></View>;
  }
  if (!locked) return <>{children}</>;

  return (
    <View style={[styles.full, { backgroundColor: colors.bgDeep }]}>
      <View style={[styles.logo, { backgroundColor: colors.tintTeal }]}>
        <Icon name="lock" size={30} color={colors.accentCyan} />
      </View>
      <Text style={[styles.title, { color: colors.textPrimary }]}>Okes is locked</Text>
      <Text style={[styles.sub, { color: error ? colors.accentPink : colors.textSecondary, marginBottom: 10 }]}>
        {error ? "Wrong passcode, try again" : "Enter your passcode"}
      </Text>
      <PinPad onComplete={submit} onBiometric={bio ? tryBio : undefined} error={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  full: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  logo: { width: 64, height: 64, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 22 },
  sub: { fontFamily: fonts.body, fontSize: 14 },
});
