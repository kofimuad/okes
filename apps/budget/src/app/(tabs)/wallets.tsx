import { formatMoney, money, type NewWalletInput, type WalletDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, Field, SheetButton, toMinor } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon, Pill } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Sheet } from "../../components/Sheet";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const PROVIDER_OPTIONS: { value: WalletDto["provider"]; label: string }[] = [
  { value: "mtn_momo", label: "MTN MoMo" },
  { value: "telecel_cash", label: "Telecel" },
  { value: "airteltigo_money", label: "AirtelTigo" },
  { value: "bank", label: "Bank" },
];

const PROVIDERS: Record<WalletDto["provider"], { label: string; icon: string; key: string }> = {
  mtn_momo: { label: "MTN MoMo", icon: "account-balance-wallet", key: "amber" },
  telecel_cash: { label: "Telecel Cash", icon: "account-balance-wallet", key: "pink" },
  airteltigo_money: { label: "AirtelTigo", icon: "account-balance-wallet", key: "violet" },
  bank: { label: "Bank", icon: "account-balance", key: "mint" },
};

export default function WalletsScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["wallets"], queryFn: () => api.listWallets() });

  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<WalletDto["provider"]>("mtn_momo");
  const [label, setLabel] = useState("");
  const [masked, setMasked] = useState("");
  const [balance, setBalance] = useState("");

  const create = useMutation({
    mutationFn: (input: NewWalletInput) => api.createWallet(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallets"] });
      qc.invalidateQueries({ queryKey: ["summary"] });
      setOpen(false);
      setLabel(""); setMasked(""); setBalance("");
    },
  });

  const submit = () =>
    create.mutate({
      provider,
      label: label.trim() || PROVIDER_OPTIONS.find((p) => p.value === provider)!.label,
      maskedNumber: masked.trim() || "•••• 0000",
      balanceMinor: toMinor(balance),
      syncSource: provider === "bank" ? "manual" : "sms",
    });

  const tint: Record<string, string> = {
    amber: colors.tintGold, pink: colors.tintClay, violet: colors.tintViolet, mint: colors.tintGreen,
  };
  const accent: Record<string, string> = {
    amber: colors.accentAmber, pink: colors.accentPink, violet: colors.accentViolet, mint: colors.accentMint,
  };

  const wallets = q.data?.wallets ?? [];
  const total = q.data?.totalMinor ?? 0;

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.header}>
            <View style={{ gap: 3 }}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Wallets</Text>
              <Text style={[styles.sub, { color: colors.textMuted }]}>
                {wallets.length} linked · {formatMoney(money(total))}
              </Text>
            </View>
            <Pill bg={colors.tintGreen} style={{ paddingVertical: 7, paddingHorizontal: 12 }}>
              <Icon name="autorenew" size={14} color={colors.accentMint} />
              <Text style={[styles.syncText, { color: colors.accentMint }]}>Synced</Text>
            </Pill>
          </View>

          {q.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : wallets.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="account-balance-wallet" size={26} color={colors.textMuted} />
              <Text style={[styles.sub, { color: colors.textSecondary }]}>No wallets linked yet</Text>
            </GlassCard>
          ) : (
            wallets.map((w) => {
              const meta = PROVIDERS[w.provider];
              return (
                <GlassCard key={w.id} style={{ gap: 14 }}>
                  <View style={styles.row}>
                    <View style={[styles.logo, { backgroundColor: tint[meta.key], borderColor: colors.hairlineBright }]}>
                      <Icon name={meta.icon as never} size={24} color={accent[meta.key]} />
                    </View>
                    <Text style={[styles.wname, { color: colors.textPrimary }]}>{w.label}</Text>
                    <Pill bg={colors.surfaceGlassStrong} style={{ paddingVertical: 5, paddingHorizontal: 9 }}>
                      <Icon name={w.syncSource === "manual" ? "edit" : "sync"} size={12} color={colors.accentCyan} />
                      <Text style={[styles.syncBadge, { color: colors.textSecondary }]}>
                        {w.syncSource === "sms" ? "SMS" : w.syncSource === "aggregator" ? "Linked" : "Manual"}
                      </Text>
                    </Pill>
                  </View>
                  <Text style={[styles.balance, { color: colors.textPrimary }]}>{formatMoney(money(w.balanceMinor))}</Text>
                  <Text style={[styles.masked, { color: colors.textMuted }]}>{w.maskedNumber}</Text>
                </GlassCard>
              );
            })
          )}

          <Pressable style={[styles.linkBtn, { borderColor: colors.hairlineBright }]} onPress={() => setOpen(true)}>
            <Icon name="add-circle" size={22} color={colors.accentCyan} />
            <Text style={[styles.linkText, { color: colors.accentCyan }]}>Link a wallet or bank</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Link a wallet">
        <ChipSelect label="PROVIDER" value={provider} options={PROVIDER_OPTIONS} onChange={setProvider} />
        <Field label="LABEL" value={label} onChangeText={setLabel} placeholder="e.g. MTN MoMo" />
        <Field label="MASKED NUMBER" value={masked} onChangeText={setMasked} placeholder="•••• 0241" />
        <Field label="CURRENT BALANCE (GHS)" value={balance} onChangeText={setBalance} placeholder="0.00" keyboardType="decimal-pad" />
        {create.isError ? <Text style={{ color: colors.accentPink, fontFamily: fonts.body, fontSize: 13 }}>Could not link wallet. Try again.</Text> : null}
        <SheetButton label="Link wallet" onPress={submit} busy={create.isPending} />
      </Sheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: "600" },
  sub: { fontFamily: fonts.body, fontSize: 13 },
  syncText: { fontFamily: fonts.semibold, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  logo: { width: 44, height: 44, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  wname: { flex: 1, fontFamily: fonts.semibold, fontSize: 15 },
  syncBadge: { fontFamily: fonts.semibold, fontSize: 10 },
  balance: { fontFamily: fonts.displayBold, fontSize: 24, fontWeight: "700" },
  masked: { fontFamily: fonts.body, fontSize: 12, letterSpacing: 1 },
  linkBtn: {
    flexDirection: "row", gap: 10, alignItems: "center", justifyContent: "center",
    paddingVertical: 18, borderRadius: radius.card, borderWidth: 1,
  },
  linkText: { fontFamily: fonts.semibold, fontSize: 14 },
});
