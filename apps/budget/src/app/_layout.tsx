import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from "@expo-google-fonts/inter";
import {
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from "@expo-google-fonts/space-grotesk";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useEffect, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../auth/AuthContext";
import { ThemeProvider, useTheme } from "../theme";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function Guard({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    if (status === "loading") return;
    const inAuthFlow = segments[0] === "welcome" || segments[0] === "login";
    if (status === "guest" && !inAuthFlow) router.replace("/welcome");
    if (status === "authed" && inAuthFlow) router.replace("/");
  }, [status, segments, router]);

  // Tapping a push notification routes to the relevant screen.
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      const route = resp.notification.request.content.data?.route as string | undefined;
      if (route) router.push(route as never);
    });
    return () => sub.remove();
  }, [router]);

  if (status === "loading") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accentCyan} size="large" />
      </View>
    );
  }
  return <>{children}</>;
}

function RootInner() {
  const { mode, colors } = useTheme();
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgDeep, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accentCyan} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <StatusBar style={mode === "dark" ? "light" : "dark"} />
            <Guard>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: colors.bgDeep },
                }}
              />
            </Guard>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootInner />
    </ThemeProvider>
  );
}
