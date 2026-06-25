import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

// Four tabs around a central "+" action (coach is reached from the Home header).
const TAB_ORDER = ["index", "wallets", "crew", "profile"] as const;
const ICONS: Record<string, IconName> = {
  index: "home-filled",
  wallets: "account-balance-wallet",
  crew: "group",
  profile: "person",
};

const BAR_BG = "#15171E";

export function OkesTabBar({ state, navigation, insets }: OkesTabBarProps) {
  const { colors } = useTheme();
  const router = useRouter();

  const byName = new Map(state.routes.map((r) => [r.name, r]));
  const activeName = state.routes[state.index]?.name;
  const tabs = TAB_ORDER.map((n) => byName.get(n)).filter((r): r is { key: string; name: string } => Boolean(r));

  const press = (route: { key: string; name: string }) => {
    const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
    if (route.name !== activeName && !event.defaultPrevented) navigation.navigate(route.name);
  };

  const Item = ({ route }: { route: { key: string; name: string } }) => {
    const focused = route.name === activeName;
    return (
      <Pressable key={route.key} onPress={() => press(route)} style={styles.item}>
        <MaterialIcons name={ICONS[route.name]} size={25} color={focused ? colors.accentCyan : "#9aa0ad"} />
        <View style={[styles.dot, { backgroundColor: focused ? colors.accentCyan : "transparent" }]} />
      </Pressable>
    );
  };

  return (
    <View style={[styles.wrap, { paddingBottom: 12 + insets.bottom }]} pointerEvents="box-none">
      <View style={[styles.bar, { backgroundColor: BAR_BG }]}>
        <Item route={tabs[0]!} />
        <Item route={tabs[1]!} />
        <View style={styles.fabSlot}>
          <Pressable onPress={() => router.push("/new")} style={[styles.fab, { backgroundColor: colors.accentCyan }]}>
            <MaterialIcons name="add" size={30} color={colors.onAccent} />
          </Pressable>
        </View>
        <Item route={tabs[2]!} />
        <Item route={tabs[3]!} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingTop: 8 },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    height: 64,
    borderRadius: 30,
    paddingHorizontal: 10,
  },
  item: { flex: 1, alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  fabSlot: { flex: 1, alignItems: "center" },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ translateY: -18 }],
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
