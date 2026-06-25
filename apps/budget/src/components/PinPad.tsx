import { fonts } from "@okes/ui";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "../theme";
import { Icon } from "./primitives";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function PinPad({
  onComplete,
  onBiometric,
  error,
}: {
  onComplete: (pin: string) => void;
  onBiometric?: () => void;
  error?: boolean;
}) {
  const { colors } = useTheme();
  const [pin, setPin] = useState("");

  const press = (d: string) => {
    const next = (pin + d).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      onComplete(next);
      setTimeout(() => setPin(""), 180);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.dots}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { borderColor: error ? colors.accentPink : colors.hairlineBright, backgroundColor: i < pin.length ? (error ? colors.accentPink : colors.accentCyan) : "transparent" },
            ]}
          />
        ))}
      </View>
      <View style={styles.pad}>
        {KEYS.map((k) => (
          <Pressable key={k} style={[styles.key, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]} onPress={() => press(k)}>
            <Text style={[styles.keyText, { color: colors.textPrimary }]}>{k}</Text>
          </Pressable>
        ))}
        {onBiometric ? (
          <Pressable style={styles.key} onPress={onBiometric}>
            <Icon name="fingerprint" size={28} color={colors.accentCyan} />
          </Pressable>
        ) : (
          <View style={styles.key} />
        )}
        <Pressable style={[styles.key, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]} onPress={() => press("0")}>
          <Text style={[styles.keyText, { color: colors.textPrimary }]}>0</Text>
        </Pressable>
        <Pressable style={styles.key} onPress={() => setPin((p) => p.slice(0, -1))}>
          <Icon name="backspace" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 30 },
  dots: { flexDirection: "row", gap: 18 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  pad: { width: 280, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 16 },
  key: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  keyText: { fontFamily: fonts.display, fontSize: 28 },
});
