import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

/** Token storage: SecureStore on native, localStorage on web. */
const web = Platform.OS === "web";
const ls = (): Storage | undefined =>
  typeof globalThis !== "undefined" ? (globalThis as { localStorage?: Storage }).localStorage : undefined;

export const storage = {
  async get(key: string): Promise<string | null> {
    if (web) return ls()?.getItem(key) ?? null;
    return SecureStore.getItemAsync(key);
  },
  async set(key: string, value: string): Promise<void> {
    if (web) ls()?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  },
  async del(key: string): Promise<void> {
    if (web) ls()?.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  },
};
