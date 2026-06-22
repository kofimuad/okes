import { radius } from "@okes/ui";
import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "../theme";

/**
 * Frosted glass surface: backdrop blur + translucent tint + hairline border.
 * The blur/tint sit BEHIND the content (zIndex -1, pointerEvents none) so they
 * never cover or intercept taps on web. Pass `tint` for coloured glass.
 */
export function GlassCard({
  children,
  style,
  bright,
  tint,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  bright?: boolean;
  tint?: string;
}) {
  const { mode, colors } = useTheme();
  return (
    <View
      style={[
        styles.card,
        { borderColor: bright ? colors.hairlineBright : colors.hairline },
        style,
      ]}
    >
      <BlurView
        pointerEvents="none"
        intensity={mode === "dark" ? 24 : 40}
        tint={mode === "dark" ? "dark" : "light"}
        style={[StyleSheet.absoluteFill, styles.behind]}
      />
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.behind, { backgroundColor: tint ?? colors.surfaceGlass }]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: 18,
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
  },
  behind: { zIndex: -1 },
});
