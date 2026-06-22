import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../theme";

/**
 * Pencil backdrop: a clean vertical navy gradient (lighter at the very top,
 * darkening toward the bottom). Explicit vertical start/end so it runs
 * edge-to-edge with no diagonal seam.
 */
export function ScreenBackground({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgGradTop, colors.bgDeep, colors.bgGradBottom]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
