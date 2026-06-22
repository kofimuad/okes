import { createApiClient } from "@okes/core";

// Defaults to the deployed Railway API so any build "just works" without a
// terminal. For LOCAL dev against your own API, override when starting Metro:
//   EXPO_PUBLIC_API_URL="http://10.0.2.2:8080" npx expo start   (Android emulator)
//   EXPO_PUBLIC_API_URL="http://localhost:8080" npx expo start  (web / iOS sim)
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "https://okes-production.up.railway.app";

export const api = createApiClient(API_BASE_URL);
