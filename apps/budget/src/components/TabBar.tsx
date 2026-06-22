import { MaterialIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { fonts, radius } from "@okes/ui";
import { useTheme } from "../theme";

type IconName = ComponentProps<typeof MaterialIcons>["name"];

/** Minimal shape of the props expo-router's Tabs passes to a custom tabBar. */
export interface OkesTabBarProps {
  state: { index: number; routes: ReadonlyArray<{ key: string; name: string }> };
  navigation: {
    navigate: (name: string) => void;
    emit: (event: { type: "tabPress"; target: string; canPreventDefault: true }) => {
      defaultPrevented: boolean;
    };
  };
  insets: { bottom: number };
}

const META: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Home", icon: "rocket-launch" },
  wallets: { label: "Wallets", icon: "account-balance-wallet" },
  coach: { label: "Coach", icon: "psychology" },
  crew: { label: "Crew", icon: "groups" },
  profile: { label: "Profile", icon: "person" },
};

/** Liquid-glass capsule tab bar, wired to expo-router's Tabs navigator. */
export function OkesTabBar({ state, navigation, insets }: OkesTabBarProps) {
  const { mode, colors } = useTheme();
  return (
    <View style={[styles.wrap, { paddingBottom: 14 + insets.bottom }]} pointerEvents="box-none">
      <View style={[styles.bar, { borderColor: colors.hairline }]}>
        <BlurView
          pointerEvents="none"
          intensity={mode === "dark" ? 32 : 50}
          tint={mode === "dark" ? "dark" : "light"}
          style={[StyleSheet.absoluteFill, styles.behind]}
        />
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.behind, { backgroundColor: mode === "dark" ? "#14161EF2" : "#F7F8FAF2" }]}
        />
        {state.routes.map((route, index) => {
          const meta = META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
          };
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={[styles.item, focused && { backgroundColor: colors.tintTealStrong }]}
            >
              <MaterialIcons
                name={meta.icon}
                size={23}
                color={focused ? colors.accentCyan : colors.textMuted}
              />
              <Text
                style={[
                  styles.label,
                  { color: focused ? colors.accentCyan : colors.textMuted, fontFamily: focused ? fonts.semibold : fonts.medium },
                ]}
              >
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 8 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 6,
    overflow: "hidden",
    position: "relative",
    zIndex: 0,
  },
  behind: { zIndex: -1 },
  item: {
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  label: { fontFamily: fonts.body, fontSize: 10 },
});
