import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function getWeekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return "This wk";
  if (weeksAgo === 1) return "Last wk";
  return `${weeksAgo}w ago`;
}

function getMonthCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workoutHistory, personalRecords, exercises, formatWeight } = useWorkout();

  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  const workoutDates = useMemo(
    () => new Set(workoutHistory.map((w) => new Date(w.startTime).toDateString())),
    [workoutHistory]
  );

  const volumeChart = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weeksAgo = 7 - i;
      const start = Date.now() - weeksAgo * 7 * 86400000;
      const end = start + 7 * 86400000;
      const vol = workoutHistory
        .filter((w) => w.startTime >= start && w.startTime < end)
        .reduce((s, w) => s + w.totalVolume, 0);
      return { label: getWeekLabel(weeksAgo), value: vol };
    });
  }, [workoutHistory]);

  const workoutsChart = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const weeksAgo = 7 - i;
      const start = Date.now() - weeksAgo * 7 * 86400000;
      const end = start + 7 * 86400000;
      const count = workoutHistory.filter((w) => w.startTime >= start && w.startTime < end).length;
      return { label: getWeekLabel(weeksAgo), value: count };
    });
  }, [workoutHistory]);

  const sortedPRs = useMemo(
    () => Object.values(personalRecords).sort((a, b) => b.estimatedOneRM - a.estimatedOneRM),
    [personalRecords]
  );

  const { firstDay, daysInMonth } = getMonthCalendar(calYear, calMonth);
  const calDays = Array.from({ length: firstDay }, () => null).concat(
    Array.from({ length: daysInMonth }, (_, i) => i + 1)
  );

  function calDateStr(day: number) {
    return new Date(calYear, calMonth, day).toDateString();
  }

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); }
    else setCalMonth((m) => m - 1);
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); }
    else setCalMonth((m) => m + 1);
  }

  const totalVolume = workoutHistory.reduce((s, w) => s + w.totalVolume, 0);
  const totalSets = workoutHistory.reduce((s, w) => s + w.totalSets, 0);
  const totalTime = workoutHistory.reduce((s, w) => s + w.duration, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 100 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topInset + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.calHeader}>
          <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            {new Date(calYear, calMonth).toLocaleDateString("en", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        <View style={[styles.calCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.calWeekRow}>
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <Text key={d} style={[styles.calDayHeader, { color: colors.mutedForeground }]}>{d}</Text>
            ))}
          </View>
          <View style={styles.calGrid}>
            {calDays.map((day, idx) => {
              if (!day) return <View key={`e${idx}`} style={styles.calCell} />;
              const dateStr = calDateStr(day);
              const hasWorkout = workoutDates.has(dateStr);
              const isToday = dateStr === now.toDateString();
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.calCell,
                    hasWorkout && { backgroundColor: colors.primary },
                    isToday && !hasWorkout && { borderWidth: 1.5, borderColor: colors.primary },
                    { borderRadius: 20 },
                  ]}
                  onPress={() => {
                    const w = workoutHistory.find((w) => new Date(w.startTime).toDateString() === dateStr);
                    if (w) router.push(`/history/${w.id}`);
                  }}
                >
                  <Text
                    style={[
                      styles.calDayText,
                      { color: hasWorkout ? "#FFF" : isToday ? colors.primary : colors.foreground },
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>All Time Stats</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.primary }]}>{workoutHistory.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Workouts</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.accent }]}>
              {totalVolume >= 1000 ? `${Math.round(totalVolume / 1000)}k` : totalVolume}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>kg Volume</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.success }]}>{totalSets}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Total Sets</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.statVal, { color: colors.info }]}>{formatDuration(totalTime)}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Time</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Weekly Volume</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {volumeChart.every((d) => d.value === 0) ? (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>No workout data yet</Text>
          ) : (
            <SimpleBarChart data={volumeChart} height={120} barColor={colors.primary} />
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Workouts per Week</Text>
        <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {workoutsChart.every((d) => d.value === 0) ? (
            <Text style={[styles.noData, { color: colors.mutedForeground }]}>No workout data yet</Text>
          ) : (
            <SimpleBarChart data={workoutsChart} height={100} barColor={colors.accent} />
          )}
        </View>
      </View>

      {sortedPRs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Personal Records</Text>
          {sortedPRs.slice(0, 10).map((pr) => {
            const ex = exercises.find((e) => e.id === pr.exerciseId);
            return (
              <TouchableOpacity
                key={pr.exerciseId}
                style={[styles.prRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => router.push(`/exercise/${pr.exerciseId}`)}
                activeOpacity={0.75}
              >
                <View style={[styles.prIcon, { backgroundColor: colors.accent + "22" }]}>
                  <Feather name="award" size={16} color={colors.accent} />
                </View>
                <View style={styles.prInfo}>
                  <Text style={[styles.prName, { color: colors.foreground }]}>{ex?.name ?? "Unknown"}</Text>
                  <Text style={[styles.prMeta, { color: colors.mutedForeground }]}>
                    {pr.weight}kg × {pr.reps} reps · 1RM ~{pr.estimatedOneRM}kg
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {workoutHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Workout History</Text>
          {workoutHistory.slice(0, 20).map((w) => (
            <TouchableOpacity
              key={w.id}
              style={[styles.histRow, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/history/${w.id}`)}
              activeOpacity={0.75}
            >
              <View style={styles.histInfo}>
                <Text style={[styles.histName, { color: colors.foreground }]}>{w.name}</Text>
                <Text style={[styles.histMeta, { color: colors.mutedForeground }]}>
                  {new Date(w.startTime).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                  {" · "}{formatDuration(w.duration)} · {w.totalSets} sets · {Math.round(w.totalVolume)}kg
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  section: { paddingHorizontal: 20, marginTop: 24 },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  calCard: { borderRadius: 16, borderWidth: 1, padding: 12 },
  calWeekRow: { flexDirection: "row", marginBottom: 8 },
  calDayHeader: { flex: 1, textAlign: "center", fontFamily: "Inter_500Medium", fontSize: 12 },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  calDayText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: "45%", borderRadius: 14, borderWidth: 1, padding: 14, alignItems: "center", gap: 4 },
  statVal: { fontFamily: "Inter_700Bold", fontSize: 22 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  noData: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", paddingVertical: 20 },
  prRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  prIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  prInfo: { flex: 1 },
  prName: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  prMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  histRow: { flexDirection: "row", alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  histInfo: { flex: 1 },
  histName: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 2 },
  histMeta: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
