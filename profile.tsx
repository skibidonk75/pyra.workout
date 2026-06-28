import { Feather } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TierBadge } from "@/components/TierBadge";
import { TIERS } from "@/constants/tiers";
import { useAuth } from "@/context/AuthContext";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import { getCurrentTier, getNextTier, getTierProgress } from "@/constants/tiers";

function formatDuration(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function AvatarSection() {
  const colors = useColors();
  const { profile, uploadAvatar, updateProfile } = useAuth();
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(profile?.display_name ?? "");
  const [savingName, setSavingName] = useState(false);

  async function saveName() {
    setSavingName(true);
    try {
      await updateProfile({ display_name: nameInput.trim() || null });
    } catch {}
    setSavingName(false);
    setEditingName(false);
  }

  const initials = (profile?.display_name ?? profile?.email ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.avatarSection}>
      <TouchableOpacity onPress={uploadAvatar} activeOpacity={0.8}>
        {profile?.avatar_url ? (
          <Image
            source={{ uri: profile.avatar_url }}
            style={[styles.avatar, { borderColor: colors.border }]}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[colors.primary, colors.accent]}
            style={[styles.avatar, styles.avatarPlaceholder]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarInitials}>{initials}</Text>
          </LinearGradient>
        )}
        <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
          <Feather name="camera" size={12} color="#FFF" />
        </View>
      </TouchableOpacity>

      {editingName ? (
        <View style={styles.nameEditRow}>
          <TextInput
            style={[styles.nameInput, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={nameInput}
            onChangeText={setNameInput}
            autoFocus
            onSubmitEditing={saveName}
          />
          <TouchableOpacity onPress={saveName} disabled={savingName}>
            {savingName ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="check" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditingName(false)}>
            <Feather name="x" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.nameRow}
          onPress={() => { setNameInput(profile?.display_name ?? ""); setEditingName(true); }}
        >
          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {profile?.display_name ?? "Set your name"}
          </Text>
          <Feather name="edit-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      )}

      <Text style={[styles.emailText, { color: colors.mutedForeground }]}>
        {profile?.email ?? ""}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { signOut } = useAuth();
  const { workoutHistory, personalRecords, settings, updateSettings, streak, longestStreak } = useWorkout();

  const totalWorkouts = workoutHistory.length;
  const currentTier = getCurrentTier(totalWorkouts);
  const nextTier = getNextTier(totalWorkouts);
  const progress = getTierProgress(totalWorkouts);

  const totalVolume = workoutHistory.reduce((s, w) => s + w.totalVolume, 0);
  const totalSets = workoutHistory.reduce((s, w) => s + w.totalSets, 0);
  const totalReps = workoutHistory.reduce((s, w) => s + w.totalReps, 0);
  const totalTime = workoutHistory.reduce((s, w) => s + w.duration, 0);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Profile</Text>
        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.border }]}
          onPress={handleSignOut}
        >
          <Feather name="log-out" size={16} color={colors.destructive} />
          <Text style={[styles.signOutText, { color: colors.destructive }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Avatar + name */}
      <AvatarSection />

      {/* Tier hero */}
      <LinearGradient
        colors={[currentTier.gradientStart + "33", colors.background]}
        style={styles.tierHero}
      >
        <TierBadge tier={currentTier} size="lg" showLabel />
        <View style={styles.progressSection}>
          <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: currentTier.color }]}
            />
          </View>
          <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>
            {totalWorkouts} workouts
            {nextTier
              ? ` · ${nextTier.minWorkouts - totalWorkouts} more to ${nextTier.label}`
              : " · Maximum tier reached!"}
          </Text>
        </View>
        <View style={styles.streakRow}>
          <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={14} color={colors.accent} />
            <Text style={[styles.streakText, { color: colors.foreground }]}>{streak} day streak</Text>
          </View>
          <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="star" size={14} color={colors.primary} />
            <Text style={[styles.streakText, { color: colors.foreground }]}>{longestStreak} best</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Stats</Text>
        <View style={styles.statsGrid}>
          {[
            { label: "Workouts", value: String(totalWorkouts), color: colors.primary },
            { label: "Volume", value: totalVolume >= 1000 ? `${Math.round(totalVolume / 1000)}k kg` : `${totalVolume} kg`, color: colors.accent },
            { label: "Total Sets", value: String(totalSets), color: colors.success },
            { label: "Total Reps", value: String(totalReps), color: colors.info },
            { label: "Time", value: formatDuration(totalTime), color: colors.warning },
            { label: "PRs", value: String(Object.keys(personalRecords).length), color: colors.accent },
          ].map((s) => (
            <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tiers */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Tiers</Text>
        <View style={[styles.tierList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {TIERS.map((tier, idx) => {
            const unlocked = totalWorkouts >= tier.minWorkouts;
            const isCurrentTier = tier.label === currentTier.label;
            return (
              <View
                key={tier.label}
                style={[styles.tierRow, { borderBottomColor: colors.border }, idx < TIERS.length - 1 && styles.tierRowBorder]}
              >
                <View style={styles.tierLeft}>
                  <LinearGradient
                    colors={unlocked ? [tier.gradientStart, tier.gradientEnd] : [colors.muted, colors.border]}
                    style={styles.tierDot}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {!unlocked && <Feather name="lock" size={10} color={colors.mutedForeground} />}
                  </LinearGradient>
                  <View>
                    <Text style={[styles.tierName, { color: unlocked ? (isCurrentTier ? tier.color : colors.foreground) : colors.mutedForeground }, isCurrentTier && styles.tierNameCurrent]}>
                      {tier.label}{isCurrentTier ? " ✓" : ""}
                    </Text>
                    <Text style={[styles.tierDesc, { color: colors.mutedForeground }]}>{tier.description}</Text>
                  </View>
                </View>
                <Text style={[styles.tierRequirement, { color: unlocked ? colors.success : colors.mutedForeground }]}>
                  {tier.minWorkouts}+ workouts
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Settings */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Settings</Text>
        <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Feather name="settings" size={18} color={colors.mutedForeground} />
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Imperial Units (lb)</Text>
            </View>
            <Switch
              value={settings.unit === "imperial"}
              onValueChange={(v) => updateSettings({ unit: v ? "imperial" : "metric" })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingLeft}>
              <Feather name="eye" size={18} color={colors.mutedForeground} />
              <Text style={[styles.settingLabel, { color: colors.foreground }]}>Show Previous Values</Text>
            </View>
            <Switch
              value={settings.showPreviousValues}
              onValueChange={(v) => updateSettings({ showPreviousValues: v })}
              trackColor={{ false: colors.muted, true: colors.primary }}
              thumbColor="#FFF"
            />
          </View>
          <TouchableOpacity style={[styles.settingRow, { borderBottomColor: colors.border }]} onPress={() => router.push("/import")}>
            <View style={styles.settingLeft}>
              <Feather name="upload" size={18} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.primary }]}>Import Data</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <Feather name="log-out" size={18} color={colors.destructive} />
              <Text style={[styles.settingLabel, { color: colors.destructive }]}>Sign Out</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.section, { marginTop: 12 }]}>
        <Text style={[styles.appVersion, { color: colors.mutedForeground }]}>
          Pyra · Powered by Supabase
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  signOutBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  signOutText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 10 },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontFamily: "Inter_700Bold", fontSize: 32, color: "#FFF" },
  avatarBadge: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#FFF" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  nameEditRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  nameInput: { height: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, fontFamily: "Inter_600SemiBold", fontSize: 16, minWidth: 180 },
  displayName: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emailText: { fontFamily: "Inter_400Regular", fontSize: 13 },
  tierHero: { alignItems: "center", paddingVertical: 32, paddingHorizontal: 20, gap: 20 },
  progressSection: { width: "100%", gap: 8 },
  progressBg: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  progressLabel: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  streakRow: { flexDirection: "row", gap: 12 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  streakText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { width: "30%", flex: 1, borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4, minWidth: 90 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 18 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
  tierList: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  tierRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  tierRowBorder: { borderBottomWidth: 1 },
  tierLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierDot: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  tierName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  tierNameCurrent: { fontFamily: "Inter_700Bold" },
  tierDesc: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  tierRequirement: { fontFamily: "Inter_500Medium", fontSize: 12 },
  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  settingLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  settingLabel: { fontFamily: "Inter_500Medium", fontSize: 15 },
  appVersion: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
});
