import { fonts, radius } from "@okes/ui";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useTheme } from "../theme";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  autoCapitalize?: "none" | "sentences" | "words";
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairline }]}
      />
    </View>
  );
}

export function ChipSelect<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <View style={styles.chips}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable
              key={o.value}
              onPress={() => onChange(o.value)}
              style={[styles.chip, { backgroundColor: on ? colors.tintTealStrong : colors.surfaceGlass, borderColor: on ? colors.hairlineBright : colors.hairline }]}
            >
              <Text style={[styles.chipText, { color: on ? colors.accentCyan : colors.textSecondary, fontFamily: on ? fonts.bold : fonts.medium }]}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SheetButton({
  label,
  onPress,
  busy,
  disabled,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={busy || disabled}
      style={[styles.button, { backgroundColor: colors.accentCyan, opacity: busy || disabled ? 0.6 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator color={colors.onAccent} />
      ) : (
        <Text style={[styles.buttonText, { color: colors.onAccent }]}>{label}</Text>
      )}
    </Pressable>
  );
}

/** Parse a major-unit string ("12.50") into integer minor units (1250). */
export function toMinor(text: string): number {
  const n = Number.parseFloat(text.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

const styles = StyleSheet.create({
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4 },
  input: { fontFamily: fonts.body, fontSize: 15, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 9, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  button: { paddingVertical: 15, borderRadius: radius.pill, alignItems: "center", marginTop: 4 },
  buttonText: { fontFamily: fonts.bold, fontSize: 15 },
});
