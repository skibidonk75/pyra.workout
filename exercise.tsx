import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SimpleBarChart } from "@/components/SimpleBarChart";
import { MUSCLE_COLORS } from "@/constants/exercises";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exercises, workoutHistory, personalRecords, formatWeight } = useWorkout();

  const exercise = exercises.find((e) => e.id === id);
  const pr = personalRecords[id ?? ""];

  const history = useMemo(() => {
    if (!id) return [];
    const records: { date: number; weight: number | null; reps: number | null; volume: number }[] = [];
    for (const workout of workoutHistory) {
      for (const ex of workout.exercises) {
        if (ex.exerciseId !== id) continue;
        const bestSet = ex.sets
          .filter((s) => s.isCompleted && s.weight)
          .sort((a, b) => (b.weight ?? 0) * (b.reps ?? 1) - (a.weight ?? 0) * (a.reps ?? 1))[0];
        if (bestSet) {
          records.push({
            date: workout.startTime,
            weight: bestSet.weight,
            reps: bestSet.reps,
            volume: ex.sets.filter((s) => s.isCompleted && s.weight && s.reps).reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
          });
        }
      }
    }
    return records.sort((a, b) => a.date - b.date).slice(-12);
  }, [id, workoutHistory]);

  const chartData = history.map((h) => ({
    label: new Date(h.date).toLocaleDateString("en", { month: "numeric", day: "numeric" }),
    value: h.weight ?? 0,
  }));

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  if (!exercise) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFound, { color: colors.mutedForeground }]}>Exercise not found</Text>
      </View>
    );
  }

  const muscleColor = MUSCLE_COLORS[exercise.primaryMuscle] ?? colors.primary;

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
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.heroSection, { borderBottomColor: colors.border }]}>
        <View style={[styles.muscleTag, { backgroundColor: muscleColor + "22" }]}>
          <View style={[styles.muscleDot, { backgroundColor: muscleColor }]} />
          <Text style={[styles.muscleName, { color: muscleColor }]}>{exercise.primaryMuscle}</Text>
        </View>
        <Text style={[styles.exName, { color: colors.foreground }]}>{exercise.name}</Text>
        <View style={styles.badges}>
          <View style={[styles.badge, { backgroundColor: colors.muted }]}>
            <Feather name="box" size={13} color={colors.mutedForeground} />
            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{exercise.equipment}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  exercise.difficulty === "Advanced"
                    ? colors.destructive + "22"
                    : exercise.difficulty === "Intermediate"
                    ? colors.warning + "22"
                    : colors.success + "22",
              },
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    exercise.difficulty === "Advanced"
                      ? colors.destructive
                      : exercise.difficulty === "Intermediate"
                      ? colors.warning
                      : colors.success,
                },
              ]}
            >
              {exercise.difficulty}
            </Text>
          </View>
          {exercise.isCustom && (
            <View style={[styles.badge, { backgroundColor: colors.info + "22" }]}>
              <Text style={[styles.badgeText, { color: colors.info }]}>Custom</Text>
            </View>
          )}
        </View>
        {exercise.secondaryMuscles.length > 0 && (
          <Text style={[styles.secondary, { color: colors.mutedForeground }]}>
            Also works: {exercise.secondaryMuscles.join(", ")}
          </Text>
        )}
        {exercise.notes && (
          <Text style={[styles.notes, { color: colors.mutedForeground }]}>{exercise.notes}</Text>
        )}
      </View>

      {pr && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Personal Record</Text>
          <View style={[styles.prCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.prIcon, { backgroundColor: colors.accent + "22" }]}>
              <Feather name="award" size={24} color={colors.accent} />
            </View>
            <View>
              <Text style={[styles.prValue, { color: colors.foreground }]}>
                {pr.weight}kg × {pr.reps} reps
              </Text>
              <Text style={[styles.prOneRM, { color: colors.accent }]}>
                Estimated 1RM: {pr.estimatedOneRM}kg
              </Text>
              <Text style={[styles.prDate, { color: colors.mutedForeground }]}>
                {new Date(pr.date).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
              </Text>
            </View>
          </View>
        </View>
      )}

      {chartData.length > 1 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Weight Progress</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SimpleBarChart data={chartData} height={120} barColor={muscleColor} unit="kg" />
          </View>
        </View>
      )}

      {history.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>History</Text>
          {history
            .slice()
            .reverse()
            .slice(0, 10)
            .map((h, i) => (
              <View key={i} style={[styles.histRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.histDate, { color: colors.mutedForeground }]}>
                  {new Date(h.date).toLocaleDateString("en", { month: "short", day: "numeric" })}
                </Text>
                <Text style={[styles.histValue, { color: colors.foreground }]}>
                  {h.weight ? `${h.weight}kg × ${h.reps ?? "?"}` : `${h.reps ?? "?"} reps`}
                </Text>
                {h.volume > 0 && (
                  <Text style={[styles.histVolume, { color: colors.mutedForeground }]}>
                    {Math.round(h.volume)}kg vol
                  </Text>
                )}
              </View>
            ))}
        </View>
      )}

      {history.length === 0 && !pr && (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            No history yet. Log this exercise in a workout to see progress.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { textAlign: "center", marginTop: 100, fontFamily: "Inter_400Regular", fontSize: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17, flex: 1, textAlign: "center" },
  heroSection: { padding: 20, gap: 10, borderBottomWidth: 1 },
  muscleTag: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  muscleDot: { width: 8, height: 8, borderRadius: 4 },
  muscleName: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  exName: { fontFamily: "Inter_700Bold", fontSize: 24 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  secondary: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 20 },
  notes: { fontFamily: "Inter_400Regular", fontSize: 14, fontStyle: "italic", lineHeight: 20 },
  section: { padding: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 12 },
  prCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  prIcon: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  prValue: { fontFamily: "Inter_700Bold", fontSize: 20 },
  prOneRM: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginTop: 2 },
  prDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  chartCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  histRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  histDate: { fontFamily: "Inter_400Regular", fontSize: 13, width: 60 },
  histValue: { fontFamily: "Inter_600SemiBold", fontSize: 14, flex: 1, textAlign: "center" },
  histVolume: { fontFamily: "Inter_400Regular", fontSize: 13 },
  empty: { alignItems: "center", padding: 40, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
