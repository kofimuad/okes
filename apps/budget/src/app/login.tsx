import { ApiError } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth/AuthContext";
import { API_BASE_URL } from "../lib/api";
import { GlassCard } from "../components/GlassCard";
import { Icon } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { useTheme } from "../theme";

export default function LoginScreen() {
  const { colors, mode: themeMode, toggle } = useTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "login") await login(email.trim(), password);
      else await register(email.trim(), password, name.trim());
      // navigation handled by the auth guard
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : `Can't reach the server at ${API_BASE_URL}. Is the API running?`,
      );
    } finally {
      setBusy(false);
    }
  };

  const field = (
    placeholder: string,
    value: string,
    onChange: (t: string) => void,
    opts: { secure?: boolean; email?: boolean } = {},
  ) => (
    <TextInput
      placeholder={placeholder}
      placeholderTextColor={colors.textMuted}
      value={value}
      onChangeText={onChange}
      secureTextEntry={opts.secure}
      autoCapitalize={opts.email ? "none" : "sentences"}
      keyboardType={opts.email ? "email-address" : "default"}
      style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairline }]}
    />
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <Pressable onPress={toggle} style={styles.themeBtn} hitSlop={10}>
          <Icon name={themeMode === "dark" ? "light-mode" : "dark-mode"} size={20} color={colors.textSecondary} />
        </Pressable>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.center}
        >
          <View style={styles.brand}>
            <View style={[styles.orb, { backgroundColor: colors.tintTeal, borderColor: colors.hairlineBright }]}>
              <Icon name="rocket-launch" size={30} color={colors.accentCyan} />
            </View>
            <Text style={[styles.wordmark, { color: colors.textPrimary }]}>Okes</Text>
            <Text style={[styles.tagline, { color: colors.textSecondary }]}>Your money, in orbit.</Text>
          </View>

          <GlassCard style={{ gap: 12 }}>
            {mode === "register" && field("Name", name, setName)}
            {field("Email", email, setEmail, { email: true })}
            {field("Password", password, setPassword, { secure: true })}

            {error ? <Text style={[styles.error, { color: colors.accentPink }]}>{error}</Text> : null}

            <Pressable
              onPress={submit}
              disabled={busy}
              style={[styles.button, { backgroundColor: colors.accentCyan, opacity: busy ? 0.7 : 1 }]}
            >
              {busy ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.onAccent }]}>
                  {mode === "login" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Pressable>

            <Pressable onPress={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
              <Text style={[styles.toggle, { color: colors.textMuted }]}>
                {mode === "login" ? "New here? " : "Already have an account? "}
                <Text style={{ color: colors.accentCyan, fontFamily: fonts.bold }}>
                  {mode === "login" ? "Create one" : "Sign in"}
                </Text>
              </Text>
            </Pressable>
          </GlassCard>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  themeBtn: { position: "absolute", top: 10, right: 20, padding: 10, zIndex: 1 },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 24, gap: 24 },
  brand: { alignItems: "center", gap: 8 },
  orb: { width: 72, height: 72, borderRadius: 36, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  wordmark: { fontFamily: fonts.displayBold, fontSize: 28, fontWeight: "700", letterSpacing: 2 },
  tagline: { fontFamily: fonts.body, fontSize: 14 },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  error: { fontFamily: fonts.body, fontSize: 13 },
  button: { paddingVertical: 16, borderRadius: radius.pill, alignItems: "center", marginTop: 4 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
  toggle: { fontFamily: fonts.body, fontSize: 13, textAlign: "center", marginTop: 4 },
});
