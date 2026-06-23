import { formatMoney, money, type CapDto, type NewCapInput } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, Field, SheetButton, Toggle, toMinor } from "../components/forms";
import { GlassCard } from "../components/GlassCard";
import { Icon, Pill, ProgressBar } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { Sheet } from "../components/Sheet";
import { api } from "../lib/api";
import { useTheme } from "../theme";

export default function CapsScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const capsQ = useQuery({ queryKey: ["caps"], queryFn: () => api.listCaps() });
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
  const caps = capsQ.data?.caps ?? [];
  const categories = catsQ.data?.categories ?? [];
  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Category";
  const ratio = (c: CapDto) => (c.limitMinor > 0 ? c.spentMinor / c.limitMinor : 0);
  const statusColor = (s: string) => (s === "over" ? colors.accentPink : s === "near" ? colors.accentAmber : colors.accentMint);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["caps"] });

  const [createOpen, setCreateOpen] = useState(false);
  const [catId, setCatId] = useState("");
  const [limit, setLimit] = useState("");
  const [lock, setLock] = useState(false);
  const [notify, setNotify] = useState(false);

  const [editCap, setEditCap] = useState<CapDto | null>(null);
  const [eLimit, setELimit] = useState("");
  const [eLock, setELock] = useState(false);
  const [eNotify, setENotify] = useState(false);
  const openEdit = (c: CapDto) => {
    setEditCap(c);
    setELimit((c.limitMinor / 100).toFixed(2));
    setELock(false);
    setENotify(false);
  };

  const create = useMutation({
    mutationFn: (input: NewCapInput) => api.createCap(input),
    onSuccess: () => { invalidate(); setCreateOpen(false); setCatId(""); setLimit(""); setLock(false); setNotify(false); },
  });
  const update = useMutation({
    mutationFn: (c: CapDto) => api.updateCap(c.id, { limitMinor: toMinor(eLimit) || c.limitMinor, lockAtLimit: eLock, notifyCrew: eNotify }),
    onSuccess: () => { invalidate(); setEditCap(null); },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteCap(id),
    onSuccess: () => { invalidate(); setEditCap(null); },
  });
  const confirmDelete = (c: CapDto) =>
    Alert.alert("Delete cap?", catName(c.categoryId), [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(c.id) },
    ]);

  const cappedIds = new Set(caps.map((c) => c.categoryId));
  const available = categories.filter((c) => !cappedIds.has(c.id));

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>Spending Caps</Text>
            <Pressable onPress={() => setCreateOpen(true)} style={[styles.iconBtn, { backgroundColor: colors.accentCyan }]}>
              <Icon name="add" size={22} color={colors.onAccent} />
            </Pressable>
          </View>

          {capsQ.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : caps.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="speed" size={26} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No spending caps yet</Text>
              <Text style={[styles.muted, { color: colors.textMuted }]}>Set a monthly limit per category</Text>
            </GlassCard>
          ) : (
            caps.map((c) => (
              <Pressable key={c.id} onPress={() => openEdit(c)}>
                <GlassCard style={{ gap: 10 }}>
                  <View style={styles.rowBetween}>
                    <Text style={[styles.capName, { color: colors.textPrimary }]}>{catName(c.categoryId)}</Text>
                    <Pill bg={c.status === "over" ? colors.tintClay : c.status === "near" ? colors.tintGold : colors.tintGreen}>
                      <Text style={[styles.statusText, { color: statusColor(c.status) }]}>{Math.round(ratio(c) * 100)}%</Text>
                    </Pill>
                  </View>
                  <ProgressBar value={ratio(c)} color={statusColor(c.status)} />
                  <Text style={[styles.muted, { color: colors.textSecondary }]}>
                    {formatMoney(money(c.spentMinor))} of {formatMoney(money(c.limitMinor), { withCode: false })}
                  </Text>
                </GlassCard>
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={createOpen} onClose={() => setCreateOpen(false)} title="New spending cap">
        {available.length === 0 ? (
          <View style={{ gap: 10, alignItems: "center", paddingVertical: 8 }}>
            <Icon name="category" size={26} color={colors.textMuted} />
            <Text style={[styles.muted, { color: colors.textSecondary }]}>
              {categories.length === 0 ? "Create a category first." : "Every category already has a cap."}
            </Text>
            {categories.length === 0 && (
              <SheetButton label="Manage categories" onPress={() => { setCreateOpen(false); router.push("/categories"); }} />
            )}
          </View>
        ) : (
          <>
            <ChipSelect label="CATEGORY" value={catId || available[0]!.id} options={available.map((c) => ({ value: c.id, label: c.name }))} onChange={setCatId} />
            <Field label="MONTHLY LIMIT (GHS)" value={limit} onChangeText={setLimit} placeholder="1000" keyboardType="decimal-pad" />
            <Toggle label="Lock spends at 100%" value={lock} onChange={setLock} />
            <Toggle label="Notify my crew when near" value={notify} onChange={setNotify} />
            <SheetButton
              label="Create cap"
              busy={create.isPending}
              disabled={toMinor(limit) <= 0}
              onPress={() => create.mutate({ categoryId: catId || available[0]!.id, limitMinor: toMinor(limit), lockAtLimit: lock, notifyCrew: notify })}
            />
          </>
        )}
      </Sheet>

      <Sheet visible={editCap !== null} onClose={() => setEditCap(null)} title={editCap ? catName(editCap.categoryId) : "Cap"}>
        <Field label="MONTHLY LIMIT (GHS)" value={eLimit} onChangeText={setELimit} keyboardType="decimal-pad" />
        <Toggle label="Lock spends at 100%" value={eLock} onChange={setELock} />
        <Toggle label="Notify my crew when near" value={eNotify} onChange={setENotify} />
        <SheetButton label="Save changes" busy={update.isPending} onPress={() => editCap && update.mutate(editCap)} />
        <Pressable style={styles.deleteBtn} onPress={() => editCap && confirmDelete(editCap)}>
          <Icon name="delete" size={18} color={colors.accentPink} />
          <Text style={[styles.deleteText, { color: colors.accentPink }]}>Delete cap</Text>
        </Pressable>
      </Sheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 14 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  capName: { fontFamily: fonts.semibold, fontSize: 15 },
  statusText: { fontFamily: fonts.bold, fontSize: 12 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  deleteBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  deleteText: { fontFamily: fonts.semibold, fontSize: 14 },
});
