import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WorkoutPlanCard } from "@/components/WorkoutPlanCard";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

export default function WorkoutsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { workoutPlans, deleteWorkoutPlan, duplicateWorkoutPlan, startWorkout, settings } = useWorkout();

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function handleDelete(id: string, name: string) {
    Alert.alert("Delete Plan", `Delete "${name}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteWorkoutPlan(id) },
    ]);
  }

  function handleStart(planId: string) {
    const plan = workoutPlans.find((p) => p.id === planId);
    if (!plan || plan.days.length === 0) {
      router.push("/workout/active");
      return;
    }
    if (plan.days.length === 1) {
      const day = plan.days[0];
      const exercises = day.exercises.map((pe) => ({
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        exerciseId: pe.exerciseId,
        sets: Array.from({ length: pe.sets }, (_, i) => ({
          id: `${Date.now()}_set${i}`,
          weight: pe.weight > 0 ? String(pe.weight) : "",
          reps: pe.reps > 0 ? String(pe.reps) : "",
          duration: "",
          distance: "",
          isCompleted: false as const,
        })),
        restTime: pe.restTime,
        notes: pe.notes,
      }));
      startWorkout(`${plan.name} - ${day.name}`, exercises, plan.id);
      router.push("/workout/active");
    } else {
      router.push(`/plan/${planId}`);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>My Plans</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push("/plan/new")}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <Text style={styles.addBtnText}>New Plan</Text>
        </TouchableOpacity>
      </View>

      {workoutPlans.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="list" size={52} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No plans yet</Text>
          <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>
            Create a workout plan to organize your training by day.
          </Text>
          <TouchableOpacity
            style={[styles.createBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/plan/new")}
          >
            <Text style={styles.createBtnText}>Create Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={workoutPlans}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutPlanCard
              plan={item}
              onPress={() => router.push(`/plan/${item.id}`)}
              onStart={() => handleStart(item.id)}
              onDuplicate={() => duplicateWorkoutPlan(item.id)}
              onDelete={() => handleDelete(item.id, item.name)}
            />
          )}
          contentContainerStyle={[styles.list, { paddingBottom: 100 + bottomPad }]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addBtnText: { fontFamily: "Inter_600SemiBold", fontSize: 14, color: "#FFF" },
  list: { paddingHorizontal: 20, paddingTop: 4 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 22 },
  emptyDesc: { fontFamily: "Inter_400Regular", fontSize: 15, textAlign: "center", lineHeight: 22 },
  createBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 100, marginTop: 8 },
  createBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFF" },
});
