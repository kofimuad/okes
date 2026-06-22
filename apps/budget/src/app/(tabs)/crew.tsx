import { formatMoney, money, type CrewDto, type NewCrewInput } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChipSelect, Field, SheetButton } from "../../components/forms";
import { GlassCard } from "../../components/GlassCard";
import { Icon, Pill, SectionHeader } from "../../components/primitives";
import { ScreenBackground } from "../../components/ScreenBackground";
import { Sheet } from "../../components/Sheet";
import { api } from "../../lib/api";
import { useTheme } from "../../theme";

const ROLES: Record<CrewDto["role"], { label: string; icon: string; key: string }> = {
  guardian: { label: "Guardian", icon: "shield", key: "pink" },
  accountability: { label: "Accountability", icon: "handshake", key: "amber" },
  watcher: { label: "Watcher", icon: "visibility", key: "cyan" },
};
const ROLE_OPTIONS: { value: CrewDto["role"]; label: string }[] = [
  { value: "watcher", label: "Watcher" },
  { value: "accountability", label: "Accountability" },
  { value: "guardian", label: "Guardian" },
];
const DESC: Record<CrewDto["role"], string> = {
  guardian: "Approves large spends",
  accountability: "Acknowledges overspends",
  watcher: "Sees your budget & alerts",
};

export default function CrewScreen() {
  const { colors } = useTheme();
  const qc = useQueryClient();
  const crewQ = useQuery({ queryKey: ["crew"], queryFn: () => api.listCrew() });
  const aprQ = useQuery({ queryKey: ["approvals"], queryFn: () => api.listApprovals() });

  const [inviteOpen, setInviteOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<CrewDto["role"]>("watcher");

  const invite = useMutation({
    mutationFn: (input: NewCrewInput) => api.createCrewMember(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crew"] }); setInviteOpen(false); setName(""); setRole("watcher"); },
  });
  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "declined" }) => api.decideApproval(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["approvals"] }),
  });

  const tint: Record<string, string> = { pink: colors.tintClay, amber: colors.tintGold, cyan: colors.tintTeal };
  const accent: Record<string, string> = { pink: colors.accentPink, amber: colors.accentAmber, cyan: colors.accentCyan };
  const avatarCol: Record<string, string> = { pink: colors.accentPink, amber: colors.accentAmber, cyan: colors.accentCyan };

  const crew = crewQ.data?.crew ?? [];
  const pending = (aprQ.data?.approvals ?? []).filter((a) => a.status === "pending");

  return (
    <ScreenBackground>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Crew</Text>
            <Pressable style={[styles.invite, { backgroundColor: colors.accentCyan }]} onPress={() => setInviteOpen(true)}>
              <Icon name="person-add" size={16} color={colors.onAccent} />
              <Text style={[styles.inviteText, { color: colors.onAccent }]}>Invite</Text>
            </Pressable>
          </View>

          {pending.length > 0 && (
            <GlassCard tint={colors.tintClay} style={styles.approval}>
              <View style={styles.apTop}>
                <View style={[styles.apIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                  <Icon name="gpp-maybe" size={22} color={colors.accentPink} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.apTitle, { color: colors.textPrimary }]}>Guardian approval pending</Text>
                  <Text style={[styles.apSub, { color: colors.textSecondary }]}>
                    {formatMoney(money(pending[0]!.amountMinor))} · {pending[0]!.reason}
                  </Text>
                </View>
              </View>
              <View style={styles.apActions}>
                <Pressable
                  style={[styles.apBtn, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairline }]}
                  onPress={() => decide.mutate({ id: pending[0]!.id, status: "declined" })}
                >
                  <Text style={[styles.apBtnText, { color: colors.accentPink }]}>Decline</Text>
                </Pressable>
                <Pressable
                  style={[styles.apBtn, { backgroundColor: colors.accentMint, borderColor: colors.accentMint }]}
                  onPress={() => decide.mutate({ id: pending[0]!.id, status: "approved" })}
                >
                  <Text style={[styles.apBtnText, { color: colors.onAccent }]}>Approve</Text>
                </Pressable>
              </View>
            </GlassCard>
          )}

          <SectionHeader icon="verified-user" iconColor={colors.accentCyan} title="Trusted Crew" />

          {crewQ.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 16 }} />
          ) : crew.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="groups" size={26} color={colors.textMuted} />
              <Text style={[styles.apSub, { color: colors.textSecondary }]}>No crew yet — invite a trusted friend</Text>
            </GlassCard>
          ) : (
            crew.map((m) => {
              const role = ROLES[m.role];
              return (
                <GlassCard key={m.id} style={styles.memberRow}>
                  <View style={{ width: 46, height: 46 }}>
                    <View style={[styles.avatar, { backgroundColor: avatarCol[role.key] }]}>
                      <Text style={[styles.avatarText, { color: colors.onAccent }]}>{m.initial}</Text>
                    </View>
                    {m.online && <View style={[styles.online, { backgroundColor: colors.accentMint, borderColor: colors.bgDeep }]} />}
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.mName, { color: colors.textPrimary }]}>{m.name}</Text>
                    <Text style={[styles.apSub, { color: colors.textMuted }]}>{DESC[m.role]}</Text>
                  </View>
                  <Pill bg={tint[role.key]}>
                    <Icon name={role.icon as never} size={14} color={accent[role.key]} />
                    <Text style={[styles.roleText, { color: accent[role.key] }]}>{role.label}</Text>
                  </Pill>
                </GlassCard>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite to your crew">
        <Field label="NAME" value={name} onChangeText={setName} placeholder="e.g. Ama Owusu" />
        <ChipSelect label="ROLE" value={role} options={ROLE_OPTIONS} onChange={setRole} />
        <SheetButton
          label="Add to crew"
          busy={invite.isPending}
          disabled={!name.trim()}
          onPress={() => invite.mutate({ name: name.trim(), initial: (name.trim()[0] || "?").toUpperCase(), role })}
        />
      </Sheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 130, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: fonts.display, fontSize: 24, fontWeight: "600" },
  invite: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 14, borderRadius: radius.pill },
  inviteText: { fontFamily: fonts.semibold, fontSize: 13 },
  approval: { gap: 12, padding: 14 },
  apTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  apActions: { flexDirection: "row", gap: 10, justifyContent: "flex-end" },
  apBtn: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1 },
  apBtnText: { fontFamily: fonts.bold, fontSize: 13 },
  apIcon: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  apTitle: { fontFamily: fonts.semibold, fontSize: 14 },
  apSub: { fontFamily: fonts.body, fontSize: 12 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 17, fontWeight: "700" },
  online: { position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  mName: { fontFamily: fonts.semibold, fontSize: 15 },
  roleText: { fontFamily: fonts.bold, fontSize: 11 },
});
