import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, radius } from "@okes/ui";
import { useTheme } from "../theme";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

export function Icon({
  name,
  size = 20,
  color,
}: {
  name: IconName;
  size?: number;
  color: string;
}) {
  return <MaterialIcons name={name} size={size} color={color} />;
}

/** Horizontal progress track with a coloured fill. `value` is 0..1. */
export function ProgressBar({
  value,
  color,
  height = 8,
}: {
  value: number;
  color: string;
  height?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[styles.track, { backgroundColor: colors.trackBg, height, borderRadius: height }]}
    >
      <View
        style={{
          width: `${Math.min(Math.max(value, 0), 1) * 100}%`,
          height,
          borderRadius: height,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export function Pill({
  children,
  bg,
  style,
}: {
  children: ReactNode;
  bg: string;
  style?: object;
}) {
  return <View style={[styles.pill, { backgroundColor: bg }, style]}>{children}</View>;
}

export function SectionHeader({
  icon,
  iconColor,
  title,
  action,
  onAction,
}: {
  icon: IconName;
  iconColor: string;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.row}>
        <Icon name={icon} size={20} color={iconColor} />
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.action, { color: colors.accentCyan }]}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: "100%", overflow: "hidden" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: { fontFamily: fonts.display, fontSize: 17 },
  action: { fontFamily: fonts.semibold, fontSize: 13 },
});
