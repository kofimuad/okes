import { formatMoney, money, type CrewDto } from "@okes/core";
import { fonts, radius } from "@okes/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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
  const invitesQ = useQuery({ queryKey: ["incomingInvites"], queryFn: () => api.listIncomingInvites() });
  const watchingQ = useQuery({ queryKey: ["watching"], queryFn: () => api.listWatching() });
  const incomingAprQ = useQuery({ queryKey: ["incomingApprovals"], queryFn: () => api.listIncomingApprovals() });

  const tint: Record<string, string> = { pink: colors.tintClay, amber: colors.tintGold, cyan: colors.tintTeal };
  const accent: Record<string, string> = { pink: colors.accentPink, amber: colors.accentAmber, cyan: colors.accentCyan };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CrewDto["role"]>("watcher");

  const invite = useMutation({
    mutationFn: () => api.inviteCrew(email.trim().toLowerCase(), role),
    onSuccess: (res) => {
      setInviteOpen(false); setEmail(""); setRole("watcher");
      Alert.alert(
        "Invitation sent",
        res.inviteeExists ? "They'll see it in their Crew tab." : "We'll link them once they join Okes with that email.",
      );
    },
    onError: (e) => Alert.alert("Couldn't send invite", e instanceof Error ? e.message : "Try again."),
  });

  const invalidateCrew = () => {
    for (const k of ["crew", "incomingInvites", "watching", "incomingApprovals"]) qc.invalidateQueries({ queryKey: [k] });
  };
  const acceptInvite = useMutation({ mutationFn: (id: string) => api.acceptInvite(id), onSuccess: invalidateCrew });
  const declineInvite = useMutation({ mutationFn: (id: string) => api.declineInvite(id), onSuccess: invalidateCrew });
  const decideIncoming = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "declined" }) => api.decideIncomingApproval(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["incomingApprovals"] }),
  });

  const [manage, setManage] = useState<CrewDto | null>(null);
  const [mRole, setMRole] = useState<CrewDto["role"]>("watcher");
  const openManage = (m: CrewDto) => { setManage(m); setMRole(m.role); };
  const updateMember = useMutation({
    mutationFn: (m: CrewDto) => api.updateCrewMember(m.id, { role: mRole }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crew"] }); setManage(null); },
  });
  const removeMember = useMutation({
    mutationFn: (id: string) => api.deleteCrewMember(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["crew"] }); setManage(null); },
  });
  const confirmRemove = (m: CrewDto) =>
    Alert.alert("Remove from crew?", m.name, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeMember.mutate(m.id) },
    ]);

  const crew = crewQ.data?.crew ?? [];
  const invites = invitesQ.data?.invites ?? [];
  const watching = watchingQ.data?.watching ?? [];
  const incoming = incomingAprQ.data?.approvals ?? [];

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

          {/* Invitations waiting for me */}
          {invites.map((inv) => {
            const r = ROLES[inv.role];
            return (
              <GlassCard key={inv.id} tint={colors.tintTeal} style={styles.approval}>
                <View style={styles.apTop}>
                  <View style={[styles.apIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                    <Icon name="mail" size={20} color={colors.accentCyan} />
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.apTitle, { color: colors.textPrimary }]}>{inv.inviterName} invited you</Text>
                    <Text style={[styles.apSub, { color: colors.textSecondary }]}>As {r.label} · {DESC[inv.role]}</Text>
                  </View>
                </View>
                <View style={styles.apActions}>
                  <Pressable style={[styles.apBtn, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairline }]} onPress={() => declineInvite.mutate(inv.id)}>
                    <Text style={[styles.apBtnText, { color: colors.accentPink }]}>Decline</Text>
                  </Pressable>
                  <Pressable style={[styles.apBtn, { backgroundColor: colors.accentMint, borderColor: colors.accentMint }]} onPress={() => acceptInvite.mutate(inv.id)}>
                    <Text style={[styles.apBtnText, { color: colors.onAccent }]}>Accept</Text>
                  </Pressable>
                </View>
              </GlassCard>
            );
          })}

          {/* Approval requests routed to me as a guardian */}
          {incoming.map((a) => (
            <GlassCard key={a.id} tint={colors.tintClay} style={styles.approval}>
              <View style={styles.apTop}>
                <View style={[styles.apIcon, { backgroundColor: colors.surfaceGlassStrong }]}>
                  <Icon name="gpp-maybe" size={22} color={colors.accentPink} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.apTitle, { color: colors.textPrimary }]}>{a.requesterName} needs approval</Text>
                  <Text style={[styles.apSub, { color: colors.textSecondary }]}>{formatMoney(money(a.amountMinor))} · {a.reason}</Text>
                </View>
              </View>
              <View style={styles.apActions}>
                <Pressable style={[styles.apBtn, { backgroundColor: colors.surfaceGlassStrong, borderColor: colors.hairline }]} onPress={() => decideIncoming.mutate({ id: a.id, status: "declined" })}>
                  <Text style={[styles.apBtnText, { color: colors.accentPink }]}>Decline</Text>
                </Pressable>
                <Pressable style={[styles.apBtn, { backgroundColor: colors.accentMint, borderColor: colors.accentMint }]} onPress={() => decideIncoming.mutate({ id: a.id, status: "approved" })}>
                  <Text style={[styles.apBtnText, { color: colors.onAccent }]}>Approve</Text>
                </Pressable>
              </View>
            </GlassCard>
          ))}

          {/* People who trust me with their budget */}
          {watching.length > 0 && (
            <>
              <SectionHeader icon="visibility" iconColor={colors.accentViolet} title="You're watching" />
              {watching.map((w) => {
                const r = ROLES[w.role];
                return (
                  <GlassCard key={w.ownerId} style={styles.memberRow}>
                    <View style={[styles.avatar, { backgroundColor: accent[r.key] }]}>
                      <Text style={[styles.avatarText, { color: colors.onAccent }]}>{w.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={[styles.mName, { color: colors.textPrimary }]}>{w.name}</Text>
                      <Text style={[styles.apSub, { color: colors.textMuted }]}>
                        {formatMoney(money(w.balanceMinor))}
                        {w.capsOver > 0 ? ` · ${w.capsOver} over budget` : w.capsNear > 0 ? ` · ${w.capsNear} near a cap` : " · on track"}
                      </Text>
                    </View>
                    <Pill bg={tint[r.key]}>
                      <Icon name={r.icon as never} size={14} color={accent[r.key]} />
                      <Text style={[styles.roleText, { color: accent[r.key] }]}>{r.label}</Text>
                    </Pill>
                  </GlassCard>
                );
              })}
            </>
          )}

          <SectionHeader icon="verified-user" iconColor={colors.accentCyan} title="Trusted Crew" />

          {crewQ.isLoading ? (
            <ActivityIndicator color={colors.accentCyan} style={{ marginTop: 16 }} />
          ) : crew.length === 0 ? (
            <GlassCard style={{ alignItems: "center", gap: 6 }}>
              <Icon name="groups" size={26} color={colors.textMuted} />
              <Text style={[styles.apSub, { color: colors.textSecondary }]}>No crew yet — invite a trusted friend by email</Text>
            </GlassCard>
          ) : (
            crew.map((m) => {
              const r = ROLES[m.role];
              const linked = Boolean(m.friendUserId);
              return (
                <Pressable key={m.id} onPress={() => openManage(m)}>
                  <GlassCard style={styles.memberRow}>
                    <View style={{ width: 46, height: 46 }}>
                      <View style={[styles.avatar, { backgroundColor: accent[r.key] }]}>
                        <Text style={[styles.avatarText, { color: colors.onAccent }]}>{m.initial}</Text>
                      </View>
                      {linked && <View style={[styles.online, { backgroundColor: colors.accentMint, borderColor: colors.bgDeep }]} />}
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={[styles.mName, { color: colors.textPrimary }]}>{m.name}</Text>
                        <Pill bg={linked ? colors.tintGreen : colors.surfaceGlassStrong} style={{ paddingVertical: 2, paddingHorizontal: 7 }}>
                          <Text style={[styles.linkText, { color: linked ? colors.accentMint : colors.textMuted }]}>{linked ? "Linked" : "Pending"}</Text>
                        </Pill>
                      </View>
                      <Text style={[styles.apSub, { color: colors.textMuted }]}>{DESC[m.role]}</Text>
                    </View>
                    <Pill bg={tint[r.key]}>
                      <Icon name={r.icon as never} size={14} color={accent[r.key]} />
                      <Text style={[styles.roleText, { color: accent[r.key] }]}>{r.label}</Text>
                    </Pill>
                  </GlassCard>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>

      <Sheet visible={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite to your crew">
        <Field label="EMAIL" value={email} onChangeText={setEmail} placeholder="friend@email.com" keyboardType="default" autoCapitalize="none" />
        <ChipSelect label="ROLE" value={role} options={ROLE_OPTIONS} onChange={setRole} />
        <Text style={[styles.apSub, { color: colors.textMuted }]}>{DESC[role]}</Text>
        <SheetButton
          label="Send invitation"
          busy={invite.isPending}
          disabled={!email.includes("@")}
          onPress={() => invite.mutate()}
        />
      </Sheet>

      <Sheet visible={manage !== null} onClose={() => setManage(null)} title={manage?.name ?? "Crew member"}>
        <ChipSelect label="ROLE" value={mRole} options={ROLE_OPTIONS} onChange={setMRole} />
        <SheetButton label="Save role" busy={updateMember.isPending} onPress={() => manage && updateMember.mutate(manage)} />
        <Pressable style={styles.removeBtn} onPress={() => manage && confirmRemove(manage)}>
          <Icon name="person-remove" size={18} color={colors.accentPink} />
          <Text style={[styles.removeText, { color: colors.accentPink }]}>Remove from crew</Text>
        </Pressable>
      </Sheet>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  removeBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  removeText: { fontFamily: fonts.semibold, fontSize: 14 },
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
  linkText: { fontFamily: fonts.semibold, fontSize: 10 },
});
