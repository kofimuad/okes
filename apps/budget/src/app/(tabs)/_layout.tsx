import { Tabs } from "expo-router";
import { OkesTabBar, type OkesTabBarProps } from "../../components/TabBar";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: "transparent" } }}
      tabBar={(props) => <OkesTabBar {...(props as unknown as OkesTabBarProps)} />}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="wallets" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="crew" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
