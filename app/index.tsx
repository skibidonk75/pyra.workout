import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatCard } from "@/components/StatCard";
import { TierBadge } from "@/components/TierBadge";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import { getCurrentTier, getNextTier, getTierProgress } from "@/constants/tiers";

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getWeekDays() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push({ date: d.toDateString(), label: d.toLocaleDateString("en", { weekday: "short" })[0] });
  }
  return days;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workoutHistory, personalRecords, exercises, streak, activeWorkout, workoutPlans } = useWorkout();

  const weekDays = useMemo(() => getWeekDays(), []);
  const workoutDates = useMemo(
    () => new Set(workoutHistory.map((w) => new Date(w.startTime).toDateString())),
    [workoutHistory]
  );

  const totalWorkouts = workoutHistory.length;
  const tier = getCurrentTier(totalWorkouts);
  const nextTier = getNextTier(totalWorkouts);
  const progress = getTierProgress(totalWorkouts);

  const recentWorkouts = workoutHistory.slice(0, 5);

  const weeklyVolume = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return workoutHistory
      .filter((w) => w.startTime > cutoff)
      .reduce((s, w) => s + w.totalVolume, 0);
  }, [workoutHistory]);

  const weeklyCount = useMemo(() => {
    const cutoff = Date.now() - 7 * 86400000;
    return workoutHistory.filter((w) => w.startTime > cutoff).length;
  }, [workoutHistory]);

  const topPRs = useMemo(() => {
    return Object.values(personalRecords)
      .sort((a, b) => b.date - a.date)
      .slice(0, 3);
  }, [personalRecords]);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <LinearGradient
        colors={[colors.primary + "22", colors.background]}
        style={[styles.header, { paddingTop: topInset + 16 }]}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{getGreeting()}</Text>
            <Text style={[styles.title, { color: colors.foreground }]}>Pyra</Text>
          </View>
          <TierBadge tier={tier} size="sm" showLabel={false} />
        </View>

        {streak > 0 && (
          <View style={[styles.streakBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="zap" size={16} color={colors.accent} />
            <Text style={[styles.streakText, { color: colors.foreground }]}>
              {streak} day streak
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/workout/active")}
          activeOpacity={0.85}
        >
          <Feather name="play" size={20} color="#FFF" />
          <Text style={styles.startBtnText}>
            {activeWorkout ? "Resume Workout" : "Start Workout"}
          </Text>
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.section}>
        <View style={styles.weekRow}>
          {weekDays.map((day) => {
            const done = workoutDates.has(day.date);
            const isToday = day.date === new Date().toDateString();
            return (
              <View key={day.date} style={styles.dayItem}>
                <Text style={[styles.dayLabel, { color: colors.mutedForeground }]}>{day.label}</Text>
                <View
                  style={[
                    styles.dayDot,
                    {
                      backgroundColor: done ? colors.primary : isToday ? colors.border : colors.muted,
                      borderWidth: isToday ? 2 : 0,
                      borderColor: colors.primary,
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.section, styles.statsRow]}>
        <StatCard label="Workouts" value={String(weeklyCount)} subtitle="this week" accent={colors.primary} />
        <StatCard label="Volume" value={weeklyVolume > 0 ? `${Math.round(weeklyVolume / 1000)}k` : "0"} subtitle="this week" accent={colors.accent} />
        <StatCard label="Streak" value={String(streak)} subtitle={streak === 1 ? "day" : "days"} accent={colors.success} />
      </View>

      {totalWorkouts > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Tier Progress</Text>
            <Text style={[styles.seeAll, { color: colors.primary }]} onPress={() => router.push("/(tabs)/profile")}>
              View all
            </Text>
          </View>
          <View style={[styles.tierCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TierBadge tier={tier} size="md" showLabel />
            <View style={styles.tierInfo}>
              <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
                <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: tier.color }]} />
              </View>
              <Text style={[styles.tierMeta, { color: colors.mutedForeground }]}>
                {totalWorkouts} workouts
                {nextTier ? ` · ${nextTier.minWorkouts - totalWorkouts} to ${nextTier.label}` : " · Max tier!"}
              </Text>
            </View>
          </View>
        </View>
      )}

      {recentWorkouts.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Workouts</Text>
            <Text style={[styles.seeAll, { color: colors.primary }]} onPress={() => router.push("/(tabs)/progress")}>
              See all
            </Text>
          </View>
          {recentWorkouts.map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.historyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/history/${w.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.historyLeft}>
                <Text style={[styles.historyName, { color: colors.foreground }]}>{w.name}</Text>
                <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                  {new Date(w.startTime).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}{formatDuration(w.duration)}
                  {" · "}{w.totalSets} sets
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {topPRs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Records</Text>
            <Text style={[styles.seeAll, { color: colors.primary }]} onPress={() => router.push("/(tabs)/progress")}>
              See all
            </Text>
          </View>
          {topPRs.map((pr) => {
            const ex = exercises.find((e) => e.id === pr.exerciseId);
            return (
              <View key={pr.exerciseId} style={[styles.prCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.prIcon, { backgroundColor: colors.accent + "22" }]}>
                  <Feather name="award" size={16} color={colors.accent} />
                </View>
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.foreground }]}>{ex?.name ?? "Unknown"}</Text>
                  <Text style={[styles.prValue, { color: colors.mutedForeground }]}>
                    {pr.weight}kg × {pr.reps} · 1RM ~{pr.estimatedOneRM}kg
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {workoutHistory.length === 0 && workoutPlans.length === 0 && (
        <View style={styles.emptyContainer}>
          <Feather name="activity" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Ready to start?</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Tap "Start Workout" to log your first session, or create a plan first.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 20 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { fontFamily: "Inter_400Regular", fontSize: 14, marginBottom: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  streakBadge: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  streakText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  startBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  startBtnText: { fontFamily: "Inter_700Bold", fontSize: 17, color: "#FFF" },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  seeAll: { fontFamily: "Inter_500Medium", fontSize: 14 },
  weekRow: { flexDirection: "row", justifyContent: "space-between" },
  dayItem: { alignItems: "center", gap: 6 },
  dayLabel: { fontFamily: "Inter_400Regular", fontSize: 12 },
  dayDot: { width: 28, height: 28, borderRadius: 14 },
  statsRow: { flexDirection: "row", gap: 10 },
  tierCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  tierInfo: { flex: 1, gap: 8 },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  tierMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  historyCard: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  historyLeft: { flex: 1 },
  historyName: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 3 },
  historyMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  prCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  prIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  prInfo: { flex: 1 },
  prName: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  prValue: { fontFamily: "Inter_400Regular", fontSize: 13 },
  emptyContainer: { alignItems: "center", paddingVertical: 60, paddingHorizontal: 40, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
