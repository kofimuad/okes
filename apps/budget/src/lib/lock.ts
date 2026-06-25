import * as LocalAuthentication from "expo-local-authentication";
import { storage } from "./storage";

const PIN = "okes.lock.pin";
const ENABLED = "okes.lock.enabled";
const BIO = "okes.lock.bio";

export const lockSettings = {
  async get() {
    const [enabled, pin, bio] = await Promise.all([storage.get(ENABLED), storage.get(PIN), storage.get(BIO)]);
    return { enabled: enabled === "1" && Boolean(pin), hasPin: Boolean(pin), bio: bio === "1" };
  },
  async setPin(pin: string) {
    await storage.set(PIN, pin);
    await storage.set(ENABLED, "1");
  },
  async checkPin(pin: string) {
    return (await storage.get(PIN)) === pin;
  },
  async setBio(v: boolean) {
    await storage.set(BIO, v ? "1" : "0");
  },
  async disable() {
    await Promise.all([storage.set(ENABLED, "0"), storage.del(PIN), storage.set(BIO, "0")]);
  },
};

export async function biometricAvailable(): Promise<boolean> {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync());
  } catch {
    return false;
  }
}

export async function biometricAuth(): Promise<boolean> {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: "Unlock Okes", fallbackLabel: "Use passcode" });
    return r.success;
  } catch {
    return false;
  }
}
