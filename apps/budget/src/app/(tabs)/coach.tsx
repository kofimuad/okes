import { formatMoney, money } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

type Action =
  | { type: "create_goal"; name: string; targetMinor: number; deadline?: string | null }
  | { type: "create_cap"; category: string; limitMinor: number; period?: "daily" | "weekly" | "monthly" };
type Msg = { id: string; role: "user" | "assistant"; text: string; action?: Action; done?: boolean };

const SUGGESTIONS = [
  { icon: "savings", label: "Save more", prompt: "How can I save more this month?" },
  { icon: "trending-down", label: "Overspending?", prompt: "Am I overspending anywhere?" },
  { icon: "flag", label: "Set a goal", prompt: "Help me set a realistic savings goal." },
] as const;

let counter = 0;
const uid = () => `m${Date.now()}_${counter++}`;

function parseAction(text: string): { display: string; action?: Action } {
  const m = text.match(/```okes-action\s*([\s\S]*?)```/);
  if (!m) return { display: text };
  let action: Action | undefined;
  try { action = JSON.parse(m[1]!.trim()); } catch { /* ignore malformed */ }
  return { display: text.replace(m[0], "").trim(), action };
}

export default function CoachScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const scrollRef = useRef<ScrollView>(null);
  const catsQ = useQuery({ queryKey: ["categories"], queryFn: () => api.listCategories() });

  const [messages, setMessages] = useState<Msg[]>([
    { id: uid(), role: "assistant", text: "Hi, I'm NOVA 👋 I can see your live balances, spending, caps and goals. Ask me how to save, where you're overspending, or to set up a goal." },
  ]);
  const [input, setInput] = useState("");

  const chat = useMutation({
    mutationFn: (history: Msg[]) => api.coachChat(history.map((m) => ({ role: m.role, content: m.text }))),
    onSuccess: (data) => {
      const { display, action } = parseAction(data.reply);
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: display || "…", action }]);
    },
    onError: (e) => setMessages((m) => [...m, { id: uid(), role: "assistant", text: e instanceof Error ? `⚠️ ${e.message}` : "⚠️ NOVA is unavailable right now." }]),
  });

  const send = (text: string) => {
    const t = text.trim();
    if (!t || chat.isPending) return;
    setInput("");
    setMessages((m) => {
      const next = [...m, { id: uid(), role: "user" as const, text: t }];
      chat.mutate(next);
      return next;
    });
  };

  const act = useMutation({
    mutationFn: async ({ action }: { id: string; action: Action }) => {
      if (action.type === "create_goal") {
        await api.createGoal({ name: action.name, icon: "savings", targetMinor: action.targetMinor, deadline: action.deadline || undefined });
      } else {
        const cat = (catsQ.data?.categories ?? []).find((c) => c.name.toLowerCase() === action.category.toLowerCase());
        if (!cat) throw new Error(`No category named "${action.category}". Create it under Categories first.`);
        await api.createCap({ categoryId: cat.id, limitMinor: action.limitMinor, period: action.period ?? "monthly" });
      }
    },
    onSuccess: (_d, { id, action }) => {
      for (const k of ["goals", "caps", "summary"]) qc.invalidateQueries({ queryKey: [k] });
      setMessages((m) => [
        ...m.map((x) => (x.id === id ? { ...x, done: true } : x)),
        { id: uid(), role: "assistant", text: action.type === "create_goal" ? "Done — your goal is set. I'll keep an eye on it. 🚀" : "Done — that cap is live. I'll alert you as you approach it." },
      ]);
    },
    onError: (e) => Alert.alert("Couldn't do that", e instanceof Error ? e.message : "Try again."),
  });

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={{ flex: 1, paddingHorizontal: 20 }}>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.push("/")} style={[styles.circle, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                <Icon name="chevron-left" size={24} color={colors.textPrimary} />
              </Pressable>
              <View style={[styles.orb, { backgroundColor: colors.tintTeal, borderColor: colors.hairlineBright }]}>
                <Icon name="smart-toy" size={20} color={colors.accentCyan} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>NOVA</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusDot, { backgroundColor: colors.accentMint }]} />
                  <Text style={[styles.statusText, { color: colors.textSecondary }]}>reads your live data</Text>
                </View>
              </View>
            </View>

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
              onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            >
              {messages.map((m) => (
                <View key={m.id} style={{ gap: 8 }}>
                  <View style={[styles.bubbleRow, { justifyContent: m.role === "assistant" ? "flex-start" : "flex-end" }]}>
                    <View
                      style={[
                        styles.bubble,
                        m.role === "assistant"
                          ? { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline, borderBottomLeftRadius: 4 }
                          : { backgroundColor: colors.tintTealStrong, borderColor: colors.hairlineBright, borderBottomRightRadius: 4 },
                      ]}
                    >
                      <Text style={[styles.bubbleText, { color: colors.textPrimary }]}>{m.text}</Text>
                    </View>
                  </View>
                  {m.action && <ActionCard action={m.action} done={m.done} busy={act.isPending} onConfirm={() => act.mutate({ id: m.id, action: m.action! })} />}
                </View>
              ))}
              {chat.isPending && (
                <View style={[styles.bubbleRow, { justifyContent: "flex-start" }]}>
                  <View style={[styles.bubble, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                    <ActivityIndicator color={colors.accentCyan} />
                  </View>
                </View>
              )}
            </ScrollView>

            {messages.length <= 1 && (
              <View style={styles.chips}>
                {SUGGESTIONS.map((s) => (
                  <Pressable key={s.label} onPress={() => send(s.prompt)} style={[styles.chip, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                    <Icon name={s.icon as never} size={15} color={colors.accentCyan} />
                    <Text style={[styles.chipText, { color: colors.textSecondary }]}>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            <View style={[styles.inputBar, { paddingBottom: insets.bottom + 90 }]}>
              <View style={[styles.field, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairline }]}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask NOVA anything…"
                  placeholderTextColor={colors.textMuted}
                  style={[styles.fieldInput, { color: colors.textPrimary }]}
                  onSubmitEditing={() => send(input)}
                  returnKeyType="send"
                />
              </View>
              <Pressable onPress={() => send(input)} disabled={!input.trim() || chat.isPending} style={[styles.send, { backgroundColor: colors.accentCyan, opacity: !input.trim() || chat.isPending ? 0.5 : 1 }]}>
                <Icon name="send" size={22} color={colors.onAccent} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

function ActionCard({ action, done, busy, onConfirm }: { action: Action; done?: boolean; busy: boolean; onConfirm: () => void }) {
  const { colors } = useTheme();
  const isGoal = action.type === "create_goal";
  const title = action.type === "create_goal" ? `New goal: ${action.name}` : `New cap: ${action.category}`;
  const sub =
    action.type === "create_goal"
      ? `Target ${formatMoney(money(action.targetMinor))}${action.deadline ? ` by ${action.deadline}` : ""}`
      : `${formatMoney(money(action.limitMinor))} / ${action.period ?? "monthly"}`;
  return (
    <View style={[styles.actionCard, { backgroundColor: colors.surfaceGlass, borderColor: colors.hairlineBright }]}>
      <View style={[styles.actionIcon, { backgroundColor: colors.tintTeal }]}>
        <Icon name={isGoal ? "flag" : "speed"} size={18} color={colors.accentCyan} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.actionSub, { color: colors.textSecondary }]}>{sub}</Text>
      </View>
      {done ? (
        <View style={styles.doneRow}>
          <Icon name="check-circle" size={18} color={colors.accentMint} />
          <Text style={[styles.doneText, { color: colors.accentMint }]}>Done</Text>
        </View>
      ) : (
        <Pressable onPress={onConfirm} disabled={busy} style={[styles.confirm, { backgroundColor: colors.accentCyan }]}>
          {busy ? <ActivityIndicator color={colors.onAccent} /> : <Text style={[styles.confirmText, { color: colors.onAccent }]}>Confirm</Text>}
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 2 },
  circle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  orb: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  title: { fontFamily: fonts.display, fontSize: 18 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontFamily: fonts.body, fontSize: 11 },
  bubbleRow: { flexDirection: "row" },
  bubble: { maxWidth: 300, borderWidth: 1, borderRadius: 18, padding: 14 },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  actionCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1, borderRadius: 16, padding: 12, maxWidth: 320 },
  actionIcon: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  actionSub: { fontFamily: fonts.body, fontSize: 12 },
  confirm: { paddingVertical: 9, paddingHorizontal: 16, borderRadius: radius.pill },
  confirmText: { fontFamily: fonts.bold, fontSize: 13 },
  doneRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  doneText: { fontFamily: fonts.semibold, fontSize: 12 },
  chips: { flexDirection: "row", gap: 8, paddingVertical: 10, justifyContent: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1 },
  chipText: { fontFamily: fonts.medium, fontSize: 12 },
  inputBar: { flexDirection: "row", gap: 10, alignItems: "center" },
  field: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 48, borderRadius: radius.pill, borderWidth: 1 },
  fieldInput: { flex: 1, fontFamily: fonts.body, fontSize: 14, paddingVertical: 0 },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
