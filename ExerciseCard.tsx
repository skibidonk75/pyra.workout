import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Exercise, MUSCLE_COLORS } from "@/constants/exercises";
import { useColors } from "@/hooks/useColors";

interface Props {
  exercise: Exercise;
  onPress?: () => void;
  onAdd?: () => void;
  showAdd?: boolean;
  compact?: boolean;
}

export function ExerciseCard({ exercise, onPress, onAdd, showAdd, compact }: Props) {
  const colors = useColors();
  const muscleColor = MUSCLE_COLORS[exercise.primaryMuscle] ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorBar, { backgroundColor: muscleColor }]} />
      <View style={styles.content}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {exercise.name}
        </Text>
        {!compact && (
          <View style={styles.meta}>
            <Text style={[styles.muscle, { color: colors.primary }]}>{exercise.primaryMuscle}</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.equipment, { color: colors.mutedForeground }]}>{exercise.equipment}</Text>
            <Text style={[styles.dot, { color: colors.mutedForeground }]}>·</Text>
            <Text
              style={[
                styles.difficulty,
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
        )}
        {compact && (
          <Text style={[styles.muscle, { color: colors.mutedForeground, fontSize: 12 }]}>
            {exercise.primaryMuscle} · {exercise.equipment}
          </Text>
        )}
        {exercise.isCustom && (
          <View style={[styles.customBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.customText, { color: colors.mutedForeground }]}>Custom</Text>
          </View>
        )}
      </View>
      {showAdd && (
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
          onPress={onAdd}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="plus" size={18} color="#FFF" />
        </TouchableOpacity>
      )}
      {!showAdd && onPress && (
        <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  colorBar: { width: 4, alignSelf: "stretch" },
  content: { flex: 1, paddingHorizontal: 12, paddingVertical: 12 },
  name: { fontFamily: "Inter_600SemiBold", fontSize: 15, marginBottom: 4 },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 4 },
  muscle: { fontFamily: "Inter_500Medium", fontSize: 13 },
  equipment: { fontFamily: "Inter_400Regular", fontSize: 13 },
  difficulty: { fontFamily: "Inter_500Medium", fontSize: 13 },
  dot: { fontSize: 13 },
  customBadge: { marginTop: 4, alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  customText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  addBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 12 },
});
