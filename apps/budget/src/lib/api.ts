import { createApiClient } from "@okes/core";
import { Platform } from "react-native";

// Android emulators reach the host machine via 10.0.2.2; everything else uses localhost.
// Override with EXPO_PUBLIC_API_URL (e.g. your LAN IP for a physical device).
const fallback =
  Platform.OS === "android" ? "http://10.0.2.2:8080" : "http://localhost:8080";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? fallback;

export const api = createApiClient(API_BASE_URL);
