import { formatMoney, money, type TransactionDto, type WalletDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, ColorSelect, Field, PALETTE, SheetButton, Toggle, toMinor } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Sheet } from "../../components/Sheet";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const SYNC_OPTIONS: { value: "sms" | "aggregator" | "manual"; label: string }[] = [
  { value: "sms", label: "SMS" },
  { value: "aggregator", label: "Linked" },
  { value: "manual", label: "Manual" },
];

export default function WalletDetail() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const walletsQ = useQuery({ queryKey: ["wallets"], queryFn: () => api.listWallets() });
  const txQ = useQuery({ queryKey: ["transactions", "wallet", id], queryFn: () => api.listTransactions({ walletId: id, limit: 100 }) });
  const wallet = walletsQ.data?.wallets.find((w) => w.id === id);
  const txns = txQ.data?.transactions ?? [];

  const invalidate = () => {
    for (const k of ["wallets", "summary", "transactions"]) qc.invalidateQueries({ queryKey: [k] });
  };

  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [masked, setMasked] = useState("");
  const [balance, setBalance] = useState("");
  const [sync, setSync] = useState<WalletDto["syncSource"]>("manual");
  const [color, setColor] = useState(PALETTE[0]!);
  const [isCredit, setIsCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState("");
  const openEdit = (w: WalletDto) => {
    setLabel(w.label);
    setMasked(w.maskedNumber);
    setBalance((w.balanceMinor / 100).toFixed(2));
    setSync(w.syncSource);
    setColor(w.color ?? PALETTE[0]!);
    setIsCredit(w.isCredit);
    setCreditLimit((w.creditLimitMinor / 100).toFixed(2));
    setOpen(true);
  };

  const update = useMutation({
    mutationFn: (w: WalletDto) => api.updateWallet(w.id, { label: label.trim() || w.label, maskedNumber: masked.trim() || w.maskedNumber, balanceMinor: toMinor(balance), syncSource: sync, color, isCredit, creditLimitMinor: isCredit ? toMinor(creditLimit) : 0 }),
    onSuccess: () => { invalidate(); setOpen(false); },
  });
  const remove = useMutation({
    mutationFn: (wid: string) => api.deleteWallet(wid),
    onSuccess: () => { invalidate(); router.back(); },
  });
  const confirmDelete = (w: WalletDto) =>
    Alert.alert("Delete wallet?", `${w.label} and its transactions will be removed.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(w.id) },
    ]);

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>{wallet?.label ?? "Wallet"}</Text>
            {wallet && (
              <Pressable onPress={() => openEdit(wallet)} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                <Icon name="edit" size={20} color={colors.textSecondary} />
              </Pressable>
            )}
          </View>

          {!wallet ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : (
            <GlassCard style={{ gap: 8 }}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>BALANCE</Text>
              <Text style={[styles.balance, { color: colors.textPrimary }]}>{formatMoney(money(wallet.balanceMinor))}</Text>
              <Text style={[styles.muted, { color: colors.textMuted }]}>{wallet.maskedNumber}</Text>
            </GlassCard>
          )}

          <Text style={[styles.section, { color: colors.textPrimary }]}>Transactions</Text>
          {txQ.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} />
          ) : txns.length === 0 ? (
            <Text style={[styles.muted, { color: colors.textMuted }]}>No transactions for this wallet yet.</Text>
          ) : (
            txns.map((t) => <Row key={t.id} tx={t} />)
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Edit wallet">
        <Field label="LABEL" value={label} onChangeText={setLabel} />
        <Field label="MASKED NUMBER" value={masked} onChangeText={setMasked} />
        <Field label="BALANCE (GHS)" value={balance} onChangeText={setBalance} keyboardType="decimal-pad" />
        <ColorSelect label="COLOR" value={color} onChange={setColor} />
        <ChipSelect label="SYNC" value={sync} options={SYNC_OPTIONS} onChange={setSync} />
        <Toggle label="Credit account" value={isCredit} onChange={setIsCredit} />
        {isCredit && <Field label="CREDIT LIMIT (GHS)" value={creditLimit} onChangeText={setCreditLimit} keyboardType="decimal-pad" />}
        <SheetButton label="Save changes" busy={update.isPending} onPress={() => wallet && update.mutate(wallet)} />
        <Pressable style={styles.deleteBtn} onPress={() => wallet && confirmDelete(wallet)}>
          <Icon name="delete" size={18} color={colors.accentPink} />
          <Text style={[styles.deleteText, { color: colors.accentPink }]}>Delete wallet</Text>
        </Pressable>
      </Sheet>
    </ScreenBackground>
  );
}

function Row({ tx }: { tx: TransactionDto }) {
  const { colors } = useTheme();
  const incoming = tx.direction === "in";
  return (
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: incoming ? colors.tintGreen : colors.tintGold }]}>
        <Icon name={incoming ? "call-received" : "shopping-bag"} size={20} color={incoming ? colors.accentMint : colors.accentAmber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txName, { color: colors.textPrimary }]}>{tx.party}</Text>
        <Text style={[styles.muted, { color: colors.textMuted }]}>{new Date(tx.occurredAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.txAmt, { color: incoming ? colors.accentMint : colors.textPrimary }]}>
        {incoming ? "+ " : "- "}{formatMoney(money(tx.amountMinor))}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.2 },
  balance: { fontFamily: fonts.displayBold, fontSize: 32 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  section: { fontFamily: fonts.display, fontSize: 17, marginTop: 4 },
  txRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  txIcon: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  txName: { fontFamily: fonts.semibold, fontSize: 14 },
  txAmt: { fontFamily: fonts.displayBold, fontSize: 14 },
  deleteBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  deleteText: { fontFamily: fonts.semibold, fontSize: 14 },
});
