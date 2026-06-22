import { parseSms } from "@okes/core";
import { PermissionsAndroid, Platform } from "react-native";

export interface SmsImportItem {
  externalRef: string;
  walletId: string;
  direction: "in" | "out";
  amountMinor: number;
  party: string;
  occurredAt: string;
}

interface RawSms {
  address?: string;
  body?: string;
  date?: number;
}
interface SmsAndroidModule {
  list(filter: string, fail: (e: string) => void, ok: (count: number, list: string) => void): void;
}

/** Auto-capture only works on Android dev/standalone builds (not Expo Go / iOS / web). */
export function smsSupported(): boolean {
  return Platform.OS === "android";
}

async function listInbox(minDate: number): Promise<RawSms[]> {
  if (Platform.OS !== "android") return [];
  let mod: SmsAndroidModule | undefined;
  try {
    const m = require("react-native-get-sms-android") as { default?: SmsAndroidModule } & SmsAndroidModule;
    mod = m.default ?? m;
  } catch {
    return []; // native module not present (e.g. Expo Go)
  }
  if (!mod?.list) return [];

  const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_SMS, {
    title: "Read transaction SMS",
    message: "Okes reads MoMo/bank SMS on your device to auto-capture transactions. Parsing happens on-device.",
    buttonPositive: "Allow",
    buttonNegative: "Not now",
  });
  if (granted !== PermissionsAndroid.RESULTS.GRANTED) throw new Error("SMS permission denied");

  return new Promise<RawSms[]>((resolve, reject) => {
    mod!.list(
      JSON.stringify({ box: "inbox", minDate }),
      (e) => reject(new Error(e)),
      (_n, list) => {
        try {
          resolve(JSON.parse(list) as RawSms[]);
        } catch (err) {
          reject(err as Error);
        }
      },
    );
  });
}

/**
 * Reads recent SMS, parses provider alerts, and maps them to import items for
 * the user's wallets. `walletByProvider` maps an SmsProvider → walletId.
 */
export async function scanSms(
  walletByProvider: Record<string, string | undefined>,
  maxAgeDays = 30,
): Promise<SmsImportItem[]> {
  const minDate = Date.now() - maxAgeDays * 86_400_000;
  const raw = await listInbox(minDate);
  const items: SmsImportItem[] = [];
  for (const m of raw) {
    const parsed = parseSms(m.address ?? "", m.body ?? "");
    if (!parsed) continue;
    const walletId = walletByProvider[parsed.provider];
    if (!walletId) continue; // no linked wallet for this provider
    const date = m.date ?? Date.now();
    items.push({
      externalRef: parsed.ref ?? `${parsed.provider}:${parsed.amountMinor}:${date}`,
      walletId,
      direction: parsed.direction,
      amountMinor: parsed.amountMinor,
      party: parsed.party,
      occurredAt: new Date(date).toISOString(),
    });
  }
  return items;
}
