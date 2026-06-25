import type { CategoryDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, ColorSelect, Field, PALETTE, SheetButton } from "../components/forms";
import { GlassCard } from "../components/GlassCard";
import { Icon } from "../components/primitives";
import { ScreenBackground } from "../components/ScreenBackground";
import { Sheet } from "../components/Sheet";
import { api } from "../lib/api";
import { useTheme } from "../theme";

const ICONS = ["restaurant", "directions-car", "wifi", "shopping-bag", "home", "school", "bolt", "favorite", "savings", "fitness-center", "local-hospital", "flight", "shopping-cart", "checkroom", "sports-esports", "card-giftcard"];
const PRESETS = [
  { name: "Supermarket", icon: "shopping-cart", color: "#d4836e" },
  { name: "Clothing", icon: "checkroom", color: "#5b8dd6" },
  { name: "House", icon: "home", color: "#8a93a6" },
  { name: "Transport", icon: "directions-car", color: "#58bab8" },
  { name: "Food", icon: "restaurant", color: "#d6ae66" },
  { name: "Health", icon: "favorite", color: "#6cba92" },
  { name: "Entertainment", icon: "sports-esports", color: "#9788c9" },
  { name: "Education", icon: "school", color: "#c96f9b" },
];

export default function CategoriesScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });
  const categories = q.data?.categories ?? [];
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["categories"] });

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(ICONS[0]!);
  const [color, setColor] = useState(PALETTE[0]!);
  const [parentId, setParentId] = useState("");

  const create = useMutation({
    mutationFn: () => api.createCategory({ name: name.trim(), icon, color, parentId: parentId || null }),
    onSuccess: () => { invalidate(); setOpen(false); setName(""); setIcon(ICONS[0]!); setColor(PALETTE[0]!); setParentId(""); },
  });
  const starter = useMutation({
    mutationFn: async () => { for (const p of PRESETS) await api.createCategory(p); },
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => api.deleteCategory(id), onSuccess: invalidate });
  const confirmDelete = (c: CategoryDto) =>
    Alert.alert("Delete category?", c.name, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => remove.mutate(c.id) },
    ]);

  const renderRow = (c: CategoryDto, child = false) => (
    <View key={c.id} style={[styles.row, child && { paddingLeft: 28 }]}>
      <View style={[styles.catIcon, { backgroundColor: c.color ? `${c.color}22` : colors.surfaceGlassStrong }]}>
        <Icon name={c.icon as never} size={18} color={c.color ?? colors.accentCyan} />
      </View>
      <Text style={[styles.catName, { color: colors.textPrimary }]}>{c.name}</Text>
      <Pressable onPress={() => confirmDelete(c)} hitSlop={10}>
        <Icon name="delete-outline" size={20} color={colors.textMuted} />
      </Pressable>
    </View>
  );

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.topBar}>
            <Pressable onPress={() => router.back()} style={[styles.iconBtn, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
              <Icon name="chevron-left" size={24} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.title, { color: colors.textPrimary, flex: 1 }]}>Categories</Text>
            <Pressable onPress={() => setOpen(true)} style={[styles.iconBtn, { backgroundColor: colors.accentCyan }]}>
              <Icon name="add" size={22} color={colors.onAccent} />
            </Pressable>
          </View>

          {q.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 24 }} />
          ) : categories.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 12, paddingVertical: 24 }}>
              <Icon name="category" size={26} color={colors.textMuted} />
              <Text style={[styles.muted, { color: colors.textSecondary }]}>No categories yet</Text>
              <SheetButton label="Add starter pack" busy={starter.isPending} onPress={() => starter.mutate()} />
            </GlassCard>
          ) : (
            <>
              <GlassCard style={{ padding: 6, gap: 2 }}>
                {topLevel.map((c) => (
                  <View key={c.id}>
                    {renderRow(c)}
                    {childrenOf(c.id).map((ch) => renderRow(ch, true))}
                  </View>
                ))}
              </GlassCard>
              <Pressable onPress={() => starter.mutate()} style={styles.starterLink}>
                <Icon name="auto-awesome" size={16} color={colors.accentCyan} />
                <Text style={[styles.starterText, { color: colors.accentCyan }]}>Add starter pack</Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={open} onClose={() => setOpen(false)} title="New category">
        <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Groceries" />
        <Text style={[styles.pickLabel, { color: colors.textSecondary }]}>ICON</Text>
        <View style={styles.iconGrid}>
          {ICONS.map((ic) => (
            <Pressable
              key={ic}
              onPress={() => setIcon(ic)}
              style={[styles.iconChoice, { backgroundColor: icon === ic ? colors.tintTealStrong : colors.surfaceGlass, borderColor: icon === ic ? colors.hairlineBright : colors.hairline }]}
            >
              <Icon name={ic as never} size={22} color={icon === ic ? colors.accentCyan : colors.textSecondary} />
            </Pressable>
          ))}
        </View>
        <ColorSelect label="COLOR" value={color} onChange={setColor} />
        <ChipSelect
          label="PARENT (optional)"
          value={parentId}
          options={[{ value: "", label: "None" }, ...topLevel.map((c) => ({ value: c.id, label: c.name }))]}
          onChange={setParentId}
        />
        <SheetButton label="Create category" busy={create.isPending} disabled={!name.trim()} onPress={() => create.mutate()} />
      </Sheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 40, gap: 16 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 20 },
  muted: { fontFamily: fonts.body, fontSize: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 10 },
  catIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  catName: { flex: 1, fontFamily: fonts.semibold, fontSize: 14 },
  pickLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.4 },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  iconChoice: { width: 52, height: 52, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  starterLink: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 6 },
  starterText: { fontFamily: fonts.semibold, fontSize: 13 },
});
