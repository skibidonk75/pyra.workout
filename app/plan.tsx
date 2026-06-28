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
import { CATEGORIES } from "@/constants/exercises";
import {
  ActiveExercise,
  PlanDay,
  PlanExercise,
  WorkoutPlan,
  useWorkout,
} from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ─── Day-of-week toggle picker ─────────────────────────────────────────────────
const WEEK_DAYS = [
  { key: "Mon", full: "Monday" },
  { key: "Tue", full: "Tuesday" },
  { key: "Wed", full: "Wednesday" },
  { key: "Thu", full: "Thursday" },
  { key: "Fri", full: "Friday" },
  { key: "Sat", full: "Saturday" },
  { key: "Sun", full: "Sunday" },
];

interface DayPickerProps {
  days: PlanDay[];
  onChange: (days: PlanDay[]) => void;
}

function DayPicker({ days, onChange }: DayPickerProps) {
  const colors = useColors();

  // Which weekday keys are active
  const activeDayNames = new Set(days.map((d) => d.name));

  function toggle(full: string) {
    if (activeDayNames.has(full)) {
      // Remove this day (ask if it has exercises)
      const existing = days.find((d) => d.name === full);
      if (existing && existing.exercises.length > 0) {
        Alert.alert(
          "Remove Day",
          `Remove ${full} and its ${existing.exercises.length} exercise(s)?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: () => onChange(days.filter((d) => d.name !== full)),
            },
          ]
        );
      } else {
        onChange(days.filter((d) => d.name !== full));
      }
    } else {
      // Add this day — insert in week order
      const newDay: PlanDay = { id: genId(), name: full, exercises: [] };
      const weekOrder = WEEK_DAYS.map((w) => w.full);
      const next = [...days, newDay].sort(
        (a, b) => weekOrder.indexOf(a.name) - weekOrder.indexOf(b.name)
      );
      onChange(next);
    }
  }

  return (
    <View style={styles.dayPickerRow}>
      {WEEK_DAYS.map(({ key, full }) => {
        const active = activeDayNames.has(full);
        return (
          <TouchableOpacity
            key={key}
            style={[
              styles.dayChip,
              {
                backgroundColor: active ? colors.primary : colors.muted,
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
            onPress={() => toggle(full)}
          >
            <Text
              style={[
                styles.dayChipText,
                { color: active ? "#FFF" : colors.mutedForeground },
              ]}
            >
              {key}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────────
export default function PlanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workoutPlans, exercises, addWorkoutPlan, updateWorkoutPlan, startWorkout, getPreviousValues } =
    useWorkout();

  const isNew = id === "new";
  const existingPlan = workoutPlans.find((p) => p.id === id);

  const [name, setName] = useState(existingPlan?.name ?? "");
  const [description, setDescription] = useState(existingPlan?.description ?? "");
  const [days, setDays] = useState<PlanDay[]>(existingPlan?.days ?? []);
  const [savedPlanId, setSavedPlanId] = useState<string | null>(
    existingPlan?.id ?? null
  );

  const [selectedDayIdx, setSelectedDayIdx] = useState<number | null>(null);
  const [showExPicker, setShowExPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerCategory, setPickerCategory] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

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

  function addExerciseToDay(exerciseId: string) {
    if (selectedDayIdx === null) return;
    const pe: PlanExercise = {
      id: genId(),
      exerciseId,
      sets: 3,
      reps: 10,
      weight: 0,
      restTime: 90,
      notes: "",
    };
    setDays((prev) =>
      prev.map((d, i) =>
        i === selectedDayIdx ? { ...d, exercises: [...d.exercises, pe] } : d
      )
    );
    setShowExPicker(false);
    setPickerSearch("");
  }

  function removeExerciseFromDay(dayIdx: number, exId: string) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIdx ? { ...d, exercises: d.exercises.filter((e) => e.id !== exId) } : d
      )
    );
  }

  function updatePlanExercise(dayIdx: number, exId: string, updates: Partial<PlanExercise>) {
    setDays((prev) =>
      prev.map((d, i) =>
        i !== dayIdx
          ? d
          : { ...d, exercises: d.exercises.map((e) => (e.id === exId ? { ...e, ...updates } : e)) }
      )
    );
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
  function handleSave(): string | null {
    if (!name.trim()) {
      Alert.alert("Error", "Please enter a plan name.");
      return null;
    }
    const planData = { name: name.trim(), description: description.trim(), days };
    if (isNew && !savedPlanId) {
      const newPlan = addWorkoutPlan(planData);
      setSavedPlanId(newPlan.id);
      return newPlan.id;
    } else {
      const pid = savedPlanId ?? existingPlan?.id;
      if (pid) updateWorkoutPlan(pid, planData);
      return pid ?? null;
    }
  }

  function handleSaveAndBack() {
    const pid = handleSave();
    if (pid !== null) router.back();
  }

  // ── Start day ─────────────────────────────────────────────────────────────────
  function handleStartDay(dayIdx: number) {
    if (!name.trim()) {
      Alert.alert("Save first", "Please enter a plan name before starting a workout.");
      return;
    }
    // Always persist first
    const pid = handleSave();
    if (!pid) return;

    const day = days[dayIdx];
    const exList: ActiveExercise[] = day.exercises.map((pe, i) => {
      const prev = getPreviousValues(pe.exerciseId);
      return {
        id: `${Date.now()}_${i}`,
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: pe.sets }, (_, si) => ({
          id: `${Date.now()}_${i}_${si}`,
          weight: pe.weight > 0 ? String(pe.weight) : prev?.weight ? String(prev.weight) : "",
          reps: pe.reps > 0 ? String(pe.reps) : prev?.reps ? String(prev.reps) : "",
          duration: "",
          distance: "",
          isCompleted: false as const,
          previousWeight: prev?.weight,
          previousReps: prev?.reps,
        })),
        restTime: pe.restTime,
        notes: pe.notes,
      };
    });

    startWorkout(`${name} - ${day.name}`, exList, pid);
    router.push("/workout/active");
  }

  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          {isNew ? "New Plan" : "Edit Plan"}
        </Text>
        <TouchableOpacity
          onPress={handleSaveAndBack}
          style={[styles.saveBtn, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.saveBtnText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 80 + bottomPad }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Plan name / description */}
        <View style={styles.formSection}>
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>PLAN NAME</Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
            ]}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Push Pull Legs"
            placeholderTextColor={colors.mutedForeground}
            autoFocus={isNew}
          />
          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>
            DESCRIPTION (optional)
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief description..."
            placeholderTextColor={colors.mutedForeground}
          />
        </View>

        {/* Training days */}
        <View style={styles.daysSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Training Days</Text>
          <Text style={[styles.sectionHint, { color: colors.mutedForeground }]}>
            Tap the days you train each week
          </Text>

          {/* Day-of-week toggles */}
          <DayPicker days={days} onChange={setDays} />

          {days.length === 0 && (
            <View style={[styles.emptyDays, { borderColor: colors.border }]}>
              <Text style={[styles.emptyDaysText, { color: colors.mutedForeground }]}>
                No training days selected yet.
              </Text>
            </View>
          )}

          {/* Day cards with exercise lists */}
          {days.map((day, dayIdx) => (
            <View
              key={day.id}
              style={[styles.dayCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.dayHeader}>
                <Text style={[styles.dayName, { color: colors.foreground }]}>{day.name}</Text>
                <TouchableOpacity
                  style={[styles.dayActionBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleStartDay(dayIdx)}
                >
                  <Feather name="play" size={14} color="#FFF" />
                  <Text style={styles.startDayText}>Start</Text>
                </TouchableOpacity>
              </View>

              {day.exercises.map((pe) => {
                const ex = exercises.find((e) => e.id === pe.exerciseId);
                return (
                  <View
                    key={pe.id}
                    style={[styles.planExRow, { borderTopColor: colors.border }]}
                  >
                    <View style={styles.planExLeft}>
                      <Text style={[styles.planExName, { color: colors.foreground }]}>
                        {ex?.name ?? "Unknown"}
                      </Text>
                      <View style={styles.planExInputs}>
                        <TextInput
                          style={[
                            styles.smallInput,
                            { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
                          ]}
                          value={String(pe.sets)}
                          onChangeText={(t) =>
                            updatePlanExercise(dayIdx, pe.id, { sets: parseInt(t) || 0 })
                          }
                          keyboardType="number-pad"
                          placeholder="Sets"
                          placeholderTextColor={colors.mutedForeground}
                        />
                        <Text style={[styles.inputSep, { color: colors.mutedForeground }]}>×</Text>
                        <TextInput
                          style={[
                            styles.smallInput,
                            { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
                          ]}
                          value={String(pe.reps)}
                          onChangeText={(t) =>
                            updatePlanExercise(dayIdx, pe.id, { reps: parseInt(t) || 0 })
                          }
                          keyboardType="number-pad"
                          placeholder="Reps"
                          placeholderTextColor={colors.mutedForeground}
                        />
                        <Text style={[styles.inputSep, { color: colors.mutedForeground }]}>reps</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => removeExerciseFromDay(dayIdx, pe.id)}>
                      <Feather name="x" size={18} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                );
              })}

              <TouchableOpacity
                style={[styles.addExToDay, { borderColor: colors.primary }]}
                onPress={() => {
                  setSelectedDayIdx(dayIdx);
                  setShowExPicker(true);
                }}
              >
                <Feather name="plus" size={14} color={colors.primary} />
                <Text style={[styles.addExToDayText, { color: colors.primary }]}>
                  Add Exercise
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Exercise picker modal */}
      <Modal
        visible={showExPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowExPicker(false)}
      >
        <View style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
          <View
            style={[
              styles.pickerHeader,
              { borderBottomColor: colors.border, paddingTop: 20 },
            ]}
          >
            <Text style={[styles.pickerTitle, { color: colors.foreground }]}>
              Add Exercise
            </Text>
            <TouchableOpacity onPress={() => setShowExPicker(false)}>
              <Feather name="x" size={22} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <View style={[styles.pickerSearch, { borderBottomColor: colors.border }]}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.input, borderColor: colors.border },
              ]}
            >
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor:
                        pickerCategory === cat ? colors.primary : colors.muted,
                    },
                  ]}
                  onPress={() => setPickerCategory(cat)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      {
                        color:
                          pickerCategory === cat ? "#FFF" : colors.mutedForeground,
                      },
                    ]}
                  >
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
                onAdd={() => addExerciseToDay(item.id)}
                onPress={() => addExerciseToDay(item.id)}
                compact
              />
            )}
            contentContainerStyle={styles.pickerList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontFamily: "Inter_700Bold", fontSize: 14, color: "#FFF" },
  scroll: { paddingBottom: 40 },
  formSection: { padding: 20, gap: 8 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1 },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontFamily: "Inter_400Regular",
    fontSize: 15,
  },
  daysSection: { paddingHorizontal: 20 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 4 },
  sectionHint: { fontFamily: "Inter_400Regular", fontSize: 13, marginBottom: 14 },
  // Day-of-week chip row
  dayPickerRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 44,
    alignItems: "center",
  },
  dayChipText: { fontFamily: "Inter_600SemiBold", fontSize: 12 },
  emptyDays: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 12,
  },
  emptyDaysText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  dayCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dayName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  dayActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  startDayText: { fontFamily: "Inter_600SemiBold", fontSize: 12, color: "#FFF" },
  planExRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 10,
  },
  planExLeft: { flex: 1, gap: 6 },
  planExName: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  planExInputs: { flexDirection: "row", alignItems: "center", gap: 6 },
  smallInput: {
    width: 48,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    textAlign: "center",
    fontFamily: "Inter_500Medium",
    fontSize: 14,
  },
  inputSep: { fontFamily: "Inter_400Regular", fontSize: 14 },
  addExToDay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 12,
  },
  addExToDayText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  pickerContainer: { flex: 1 },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  pickerTitle: { fontFamily: "Inter_700Bold", fontSize: 18 },
  pickerSearch: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  pickerList: { paddingHorizontal: 20, paddingVertical: 12 },
});
