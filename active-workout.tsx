import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseCard } from "@/components/ExerciseCard";
import { RestTimerModal } from "@/components/RestTimerModal";
import { SetRow } from "@/components/SetRow";
import { CATEGORIES } from "@/constants/exercises";
import { ActiveExercise, useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function useElapsedTimer(startTime: number | null): string {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!startTime) return "0:00";
  const s = Math.floor((now - startTime) / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function ActiveWorkoutScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ planId?: string; dayIndex?: string }>();
  const {
    activeWorkout,
    workoutPlans,
    exercises,
    startWorkout,
    cancelWorkout,
    finishWorkout,
    addExerciseToWorkout,
    removeExerciseFromWorkout,
    addSet,
    removeSet,
    updateSet,
    getPreviousValues,
    settings,
    getUnitLabel,
  } = useWorkout();

  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("All");
  const [restTimer, setRestTimer] = useState<{ visible: boolean; duration: number }>({
    visible: false,
    duration: settings.defaultRestTime,
  });

  const elapsed = useElapsedTimer(activeWorkout?.startTime ?? null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    if (!activeWorkout && params.planId) {
      const plan = workoutPlans.find((p) => p.id === params.planId);
      const dayIdx = parseInt(params.dayIndex ?? "0");
      if (plan && plan.days[dayIdx]) {
        const day = plan.days[dayIdx];
        const exList: ActiveExercise[] = day.exercises.map((pe, i) => {
          const prev = getPreviousValues(pe.exerciseId);
          return {
            id: `${Date.now()}_${i}`,
            exerciseId: pe.exerciseId,
            sets: Array.from({ length: pe.sets }, (_, si) => ({
              id: `${Date.now()}_${i}_${si}`,
              weight: pe.weight > 0 ? String(pe.weight) : (prev?.weight ? String(prev.weight) : ""),
              reps: pe.reps > 0 ? String(pe.reps) : (prev?.reps ? String(prev.reps) : ""),
              duration: "", distance: "",
              isCompleted: false as const,
              previousWeight: prev?.weight,
              previousReps: prev?.reps,
            })),
            restTime: pe.restTime,
            notes: pe.notes,
          };
        });
        startWorkout(`${plan.name} - ${day.name}`, exList, plan.id);
      }
    } else if (!activeWorkout && !params.planId) {
      startWorkout("My Workout", [], undefined);
    }
  }, []);

  const filteredExercises = useMemo(() => {
    return exercises.filter((e) => {
      const matchSearch =
        !pickerSearch ||
        e.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
        e.primaryMuscle.toLowerCase().includes(pickerSearch.toLowerCase());
      const matchCat = pickerCategory === "All" || e.category === pickerCategory;
      return matchSearch && matchCat;
    });
  }, [exercises, pickerSearch, pickerCategory]);

  function hasProgress(): boolean {
    if (!activeWorkout) return false;
    return activeWorkout.exercises.some((e) =>
      e.sets.some((s) => s.isCompleted || s.weight.trim() !== "" || s.reps.trim() !== "")
    );
  }

  function handleClose() {
    if (!activeWorkout) {
      router.back();
      return;
    }
    if (!hasProgress()) {
      cancelWorkout();
      router.back();
      return;
    }

    Alert.alert(
      "Close Workout",
      "You have unsaved progress. What would you like to do?",
      [
        { text: "Continue Workout", style: "cancel" },
        {
          text: "Save & Exit",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            finishWorkout();
            router.back();
            setTimeout(() => Alert.alert("Pyra", "Workout saved successfully!"), 400);
          },
        },
        {
          text: "Discard Workout",
          style: "destructive",
          onPress: () => {
            cancelWorkout();
            router.back();
          },
        },
      ]
    );
  }

  function handleFinish() {
    if (!activeWorkout) return;
    const completedSets = activeWorkout.exercises.reduce(
      (s, e) => s + e.sets.filter((set) => set.isCompleted).length,
      0
    );
    const totalSets = activeWorkout.exercises.reduce((s, e) => s + e.sets.length, 0);

    Alert.alert(
      "Finish Workout",
      totalSets === 0
        ? "Save this empty workout?"
        : `Save workout with ${completedSets} of ${totalSets} set${totalSets !== 1 ? "s" : ""} completed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Workout",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            finishWorkout();
            router.back();
            setTimeout(
              () => Alert.alert("Pyra", `Workout saved! ${completedSets} set${completedSets !== 1 ? "s" : ""} logged.`),
              400
            );
          },
        },
      ]
    );
  }

  function handleSetComplete(activeExId: string, setId: string, currentlyCompleted: boolean) {
    updateSet(activeExId, setId, { isCompleted: !currentlyCompleted });
    if (!currentlyCompleted) {
      const ex = activeWorkout?.exercises.find((e) => e.id === activeExId);
      if (ex) {
        setTimeout(() => {
          setRestTimer({ visible: true, duration: ex.restTime });
        }, 300);
      }
    }
  }

  function handleAddExercise(exerciseId: string) {
    const prev = getPreviousValues(exerciseId);
    addExerciseToWorkout(exerciseId, prev?.weight, prev?.reps);
    setShowExercisePicker(false);
    setPickerSearch("");
  }

  function handleRemoveExercise(activeExId: string) {
    Alert.alert("Remove Exercise", "Remove this exercise from the workout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => removeExerciseFromWorkout(activeExId) },
    ]);
  }

  const unitLabel = getUnitLabel();

  if (!activeWorkout) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Starting workout…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.topBar,
          { paddingTop: insets.top + 8, backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={handleClose} style={styles.topBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </TouchableOpacity>
        <View style={styles.topCenter}>
          <Text style={[styles.workoutName, { color: colors.foreground }]} numberOfLines={1}>
            {activeWorkout.name}
          </Text>
          <Text style={[styles.timer, { color: colors.primary }]}>{elapsed}</Text>
        </View>
        <TouchableOpacity
          style={[styles.finishBtn, { backgroundColor: colors.primary }]}
          onPress={handleFinish}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {activeWorkout.exercises.length === 0 && (
            <View style={styles.emptyState}>
              <Feather name="plus-circle" size={52} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No exercises yet</Text>
              <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
                Add exercises from the library to start logging.
              </Text>
            </View>
          )}

          {activeWorkout.exercises.map((activeEx) => {
            const exercise = exercises.find((e) => e.id === activeEx.exerciseId);
            if (!exercise) return null;
            const completedCount = activeEx.sets.filter((s) => s.isCompleted).length;
            return (
              <View
                key={activeEx.id}
                style={[styles.exerciseBlock, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exTitleRow}>
                    <Text style={[styles.exName, { color: colors.primary }]}>{exercise.name}</Text>
                    <Text style={[styles.exMeta, { color: colors.mutedForeground }]}>
                      {exercise.primaryMuscle} · {exercise.equipment}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveExercise(activeEx.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="trash-2" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.setHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 24 }]}>SET</Text>
                  <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 70, textAlign: "center" }]}>PREV</Text>
                  {exercise.trackingType === "weight_reps" && (
                    <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 60, textAlign: "center" }]}>
                      {unitLabel.toUpperCase()}
                    </Text>
                  )}
                  {(exercise.trackingType === "weight_reps" || exercise.trackingType === "bodyweight_reps") && (
                    <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 60, textAlign: "center" }]}>REPS</Text>
                  )}
                  {exercise.trackingType === "duration" && (
                    <Text style={[styles.setHeaderText, { color: colors.mutedForeground, flex: 1, textAlign: "center" }]}>SECS</Text>
                  )}
                  {exercise.trackingType === "distance_duration" && (
                    <>
                      <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 60, textAlign: "center" }]}>KM</Text>
                      <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 60, textAlign: "center" }]}>MIN</Text>
                    </>
                  )}
                  <Text style={[styles.setHeaderText, { color: colors.mutedForeground, width: 36, textAlign: "center" }]}>✓</Text>
                </View>

                {activeEx.sets.map((set, idx) => (
                  <SetRow
                    key={set.id}
                    set={set}
                    setNumber={idx + 1}
                    trackingType={exercise.trackingType}
                    unitLabel={unitLabel}
                    onUpdate={(updates) => {
                      if (updates.isCompleted !== undefined) {
                        handleSetComplete(activeEx.id, set.id, set.isCompleted);
                      } else {
                        updateSet(activeEx.id, set.id, updates);
                      }
                    }}
                    onRemove={() => {
                      if (activeEx.sets.length > 1) removeSet(activeEx.id, set.id);
                    }}
                  />
                ))}

                <View style={styles.exFooter}>
                  <Text style={[styles.completedText, { color: colors.success }]}>
                    {completedCount}/{activeEx.sets.length} sets done
                  </Text>
                  <TouchableOpacity
                    style={[styles.addSetBtn, { borderColor: colors.primary }]}
                    onPress={() => addSet(activeEx.id)}
                  >
                    <Feather name="plus" size={14} color={colors.primary} />
                    <Text style={[styles.addSetText, { color: colors.primary }]}>Add Set</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          <TouchableOpacity
            style={[styles.addExBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
            onPress={() => setShowExercisePicker(true)}
          >
            <Feather name="plus" size={20} color={colors.primary} />
            <Text style={[styles.addExText, { color: colors.primary }]}>Add Exercise</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showExercisePicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.pickerHeader, { borderBottomColor: colors.border, paddingTop: 20 }]}>
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>Add Exercise</Text>
            <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerSearch, { borderBottomColor: colors.border }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Feather name="search" size={16} color={colors.mutedForeground} />
              <TextInput
                style={[styles.searchInput, { color: colors.foreground }]}
                placeholder="Search exercises..."
                placeholderTextColor={colors.mutedForeground}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoFocus
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.filterChip, { backgroundColor: pickerCategory === cat ? colors.primary : colors.muted }]}
                  onPress={() => setPickerCategory(cat)}
                >
                  <Text style={[styles.filterText, { color: pickerCategory === cat ? "#FFF" : colors.mutedForeground }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ExerciseCard
                exercise={item}
                showAdd
                onAdd={() => handleAddExercise(item.id)}
                onPress={() => handleAddExercise(item.id)}
                compact
              />
            )}
            contentContainerStyle={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>

      <RestTimerModal
        visible={restTimer.visible}
        duration={restTimer.duration}
        onDismiss={() => setRestTimer((p) => ({ ...p, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: "Inter_400Regular", fontSize: 16 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  topBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  topCenter: { flex: 1, alignItems: "center" },
  workoutName: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  timer: { fontFamily: "Inter_700Bold", fontSize: 22, letterSpacing: 1 },
  finishBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  finishText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#FFF" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 20 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  exerciseBlock: { borderRadius: 16, borderWidth: 1, padding: 14 },
  exerciseHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  exTitleRow: { flex: 1, gap: 2 },
  exName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  exMeta: { fontFamily: "Inter_400Regular", fontSize: 13 },
  setHeader: { flexDirection: "row", alignItems: "center", paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1, gap: 8 },
  setHeaderText: { fontFamily: "Inter_500Medium", fontSize: 10, letterSpacing: 0.5 },
  exFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  completedText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  addSetBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  addSetText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  addExBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderStyle: "dashed" },
  addExText: { fontFamily: "Inter_700Bold", fontSize: 16 },
  pickerContainer: { flex: 1 },
  pickerHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1 },
  pickerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  pickerSearch: { paddingHorizontal: 20, paddingVertical: 12, gap: 10, borderBottomWidth: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 42, borderRadius: 12, borderWidth: 1 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  pickerList: { paddingHorizontal: 20, paddingVertical: 12 },
});
