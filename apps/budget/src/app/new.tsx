import { type NewTransactionInput } from "@okes/core";
import { fonts } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, Field, SheetButton, Toggle, toMinor } from "../components/forms";
import { Icon } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { api } from "../lib/api";
import { useTheme } from "../theme";

const DIRECTION_OPTIONS: { value: "in" | "out"; label: string }[] = [
  { value: "out", label: "Spending" },
  { value: "in", label: "Income" },
];
const RECURRENCE_OPTIONS: { value: "none" | "daily" | "weekly" | "monthly"; label: string }[] = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function NewTransactionScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: () => api.listWallets() });
  const wallets = walletsQ.data?.wallets ?? [];

  const [walletId, setWalletId] = useState<string | null>(null);
  const [direction, setDirection] = useState<"in" | "out">("out");
  const [party, setParty] = useState("");
  const [amount, setAmount] = useState("");
  const [paid, setPaid] = useState(true);
  const [planDate, setPlanDate] = useState("");
  const [recurrence, setRecurrence] = useState<"none" | "daily" | "weekly" | "monthly">("none");
  const activeWallet = walletId ?? wallets[0]?.id ?? null;

  const addTx = useMutation({
    mutationFn: (input: NewTransactionInput) => api.createTransaction(input),
    onSuccess: () => {
      for (const k of ["transactions", "summary", "caps", "wallets"]) qc.invalidateQueries({ queryKey: [k] });
      router.back();
    },
  });

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="close" size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary }]}>New transaction</Text>
          </View>

          {wallets.length === 0 ? (
            <View style={{ gap: 12, alignItems: "center", paddingVertical: 30 }}>
              <Icon name="account-balance-wallet" size={28} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>Link a wallet first to add transactions.</Text>
              <SheetButton label="Go to Wallets" onPress={() => { router.back(); router.push("/wallets"); }} />
            </View>
          ) : (
            <View style={{ gap: 14 }}>
              <ChipSelect label="WALLET" value={activeWallet ?? ""} options={wallets.map((w) => ({ value: w.id, label: w.label }))} onChange={setWalletId} />
              <ChipSelect label="TYPE" value={direction} options={DIRECTION_OPTIONS} onChange={setDirection} />
              <Field label="DESCRIPTION" value={party} onChangeText={setParty} placeholder="e.g. Bolt Food" />
              <Field label="AMOUNT (GHS)" value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="decimal-pad" />
              <Toggle label="Already paid" value={paid} onChange={setPaid} />
              {!paid && (
                <>
                  <Field label="DATE (optional)" value={planDate} onChangeText={setPlanDate} placeholder="2026-07-01" />
                  <ChipSelect label="REPEAT" value={recurrence} options={RECURRENCE_OPTIONS} onChange={setRecurrence} />
                </>
              )}
              <SheetButton
                label={paid ? "Add transaction" : "Plan transaction"}
                busy={addTx.isPending}
                disabled={!activeWallet || toMinor(amount) <= 0}
                onPress={() =>
                  activeWallet &&
                  addTx.mutate({
                    walletId: activeWallet,
                    direction,
                    party: party.trim() || "Transaction",
                    amountMinor: toMinor(amount),
                    paid,
                    recurrence,
                    occurredAt: !paid && planDate.trim() ? new Date(planDate.trim()).toISOString() : undefined,
                  })
                }
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 18 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  muted: { fontFamily: fonts.body, fontSize: 13 },
});
