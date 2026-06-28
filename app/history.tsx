import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

export default function HistoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workoutHistory, exercises } = useWorkout();

  const workout = workoutHistory.find((w) => w.id === id);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (!workout) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Workout not found</Text>
      </View>
    );
  }

  const date = new Date(workout.startTime);
  const endDate = new Date(workout.endTime);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 + bottomPad }}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Workout Details</Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.summarySection, { borderBottomColor: colors.border }]}>
        <Text style={[styles.workoutName, { color: colors.foreground }]}>{workout.name}</Text>
        <Text style={[styles.workoutDate, { color: colors.mutedForeground }]}>
          {date.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </Text>
        <Text style={[styles.workoutTime, { color: colors.mutedForeground }]}>
          {date.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })} – {endDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" })}
        </Text>

        <View style={styles.statsRow}>
          {[
            { label: "Duration", value: formatDuration(workout.duration), color: colors.primary },
            { label: "Volume", value: `${Math.round(workout.totalVolume)}kg`, color: colors.accent },
            { label: "Sets", value: String(workout.totalSets), color: colors.success },
            { label: "Reps", value: String(workout.totalReps), color: colors.info },
          ].map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.exercisesSection}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Exercises</Text>
        {workout.exercises.map((loggedEx) => {
          const exercise = exercises.find((e) => e.id === loggedEx.exerciseId);
          const completedSets = loggedEx.sets.filter((s) => s.isCompleted);
          const totalVolume = completedSets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0);
          return (
            <TouchableOpacity
              key={loggedEx.id}
              style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/exercise/${loggedEx.exerciseId}`)}
              activeOpacity={0.8}
            >
              <View style={styles.exHeader}>
                <Text style={[styles.exName, { color: colors.primary }]}>{exercise?.name ?? "Unknown Exercise"}</Text>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.exMeta, { color: colors.mutedForeground }]}>
                {exercise?.primaryMuscle} · {completedSets.length} sets completed
                {totalVolume > 0 ? ` · ${Math.round(totalVolume)}kg volume` : ""}
              </Text>

              {completedSets.length > 0 && (
                <View style={[styles.setsTable, { borderTopColor: colors.border }]}>
                  <View style={styles.setTableHeader}>
                    <Text style={[styles.setTableHead, { color: colors.mutedForeground }]}>SET</Text>
                    <Text style={[styles.setTableHead, { color: colors.mutedForeground }]}>WEIGHT</Text>
                    <Text style={[styles.setTableHead, { color: colors.mutedForeground }]}>REPS</Text>
                    <Text style={[styles.setTableHead, { color: colors.mutedForeground }]}>VOLUME</Text>
                  </View>
                  {loggedEx.sets.map((s, idx) => (
                    <View
                      key={s.id}
                      style={[
                        styles.setTableRow,
                        { borderTopColor: colors.border },
                        !s.isCompleted && styles.skippedRow,
                      ]}
                    >
                      <Text style={[styles.setCell, { color: s.isCompleted ? colors.foreground : colors.mutedForeground }]}>{idx + 1}</Text>
                      <Text style={[styles.setCell, { color: s.isCompleted ? colors.foreground : colors.mutedForeground }]}>
                        {s.weight ? `${s.weight}kg` : s.duration ? `${s.duration}s` : "—"}
                      </Text>
                      <Text style={[styles.setCell, { color: s.isCompleted ? colors.foreground : colors.mutedForeground }]}>
                        {s.reps ?? (s.duration ? "—" : "—")}
                      </Text>
                      <Text style={[styles.setCell, { color: s.isCompleted ? colors.success : colors.mutedForeground }]}>
                        {s.weight && s.reps ? `${Math.round(s.weight * s.reps)}kg` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { textAlign: "center", marginTop: 100, fontFamily: "Inter_400Regular", fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  summarySection: { padding: 20, gap: 8, borderBottomWidth: 1 },
  workoutName: { fontFamily: "Inter_700Bold", fontSize: 22 },
  workoutDate: { fontFamily: "Inter_500Medium", fontSize: 14 },
  workoutTime: { fontFamily: "Inter_400Regular", fontSize: 13 },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statBox: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 2 },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 17 },
  statLabel: { fontFamily: "Inter_400Regular", fontSize: 11 },
  exercisesSection: { padding: 20, gap: 12 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 4 },
  exCard: { borderRadius: 16, borderWidth: 1, padding: 14 },
  exHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  exName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  exMeta: { fontFamily: "Inter_400Regular", fontSize: 13, marginTop: 3, marginBottom: 8 },
  setsTable: { borderTopWidth: 1, paddingTop: 8 },
  setTableHeader: { flexDirection: "row", marginBottom: 6 },
  setTableHead: { flex: 1, fontFamily: "Inter_600SemiBold", fontSize: 10, letterSpacing: 0.5 },
  setTableRow: { flexDirection: "row", borderTopWidth: 1, paddingVertical: 6 },
  skippedRow: { opacity: 0.4 },
  setCell: { flex: 1, fontFamily: "Inter_500Medium", fontSize: 13 },
});
