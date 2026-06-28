import { Platform } from "react-native";
const Haptics = { impactAsync: () => {}, notificationAsync: () => {}, ImpactFeedbackStyle: { Light: null }, NotificationFeedbackType: { Success: null } };
import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ActiveSet } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  set: ActiveSet;
  setNumber: number;
  trackingType: string;
  unitLabel: string;
  onUpdate: (updates: Partial<ActiveSet>) => void;
  onRemove: () => void;
}

export function SetRow({ set, setNumber, trackingType, unitLabel, onUpdate, onRemove }: Props) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function toggleComplete() {
    const newVal = !set.isCompleted;
    scale.value = withSpring(0.9, {}, () => { scale.value = withSpring(1); });
    if (newVal) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onUpdate({ isCompleted: newVal });
  }

  const isWeightReps = trackingType === "weight_reps" || trackingType === "bodyweight_reps";
  const showWeight = trackingType === "weight_reps";
  const isDuration = trackingType === "duration";
  const isDistance = trackingType === "distance_duration";

  const bg = set.isCompleted ? colors.success + "22" : colors.card;
  const borderColor = set.isCompleted ? colors.success + "44" : colors.border;

  return (
    <View style={[styles.row, { backgroundColor: bg, borderColor }]}>
      <TouchableOpacity onPress={onRemove} style={styles.setNumContainer}>
        <Text style={[styles.setNum, { color: colors.mutedForeground }]}>{setNumber}</Text>
      </TouchableOpacity>

      {set.previousWeight != null && set.previousReps != null ? (
        <Text style={[styles.prev, { color: colors.mutedForeground }]}>
          {set.previousWeight}{unitLabel} × {set.previousReps}
        </Text>
      ) : (
        <Text style={[styles.prev, { color: colors.mutedForeground }]}>—</Text>
      )}

      {showWeight && (
        <TextInput
          style={[styles.input, { color: set.isCompleted ? colors.success : colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={set.weight}
          onChangeText={(t) => onUpdate({ weight: t })}
          keyboardType="decimal-pad"
          placeholder={unitLabel}
          placeholderTextColor={colors.mutedForeground}
          editable={!set.isCompleted}
          selectTextOnFocus
        />
      )}

      {isWeightReps && (
        <TextInput
          style={[styles.input, { color: set.isCompleted ? colors.success : colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={set.reps}
          onChangeText={(t) => onUpdate({ reps: t })}
          keyboardType="number-pad"
          placeholder="Reps"
          placeholderTextColor={colors.mutedForeground}
          editable={!set.isCompleted}
          selectTextOnFocus
        />
      )}

      {isDuration && (
        <TextInput
          style={[styles.inputWide, { color: set.isCompleted ? colors.success : colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
          value={set.duration}
          onChangeText={(t) => onUpdate({ duration: t })}
          keyboardType="decimal-pad"
          placeholder="Seconds"
          placeholderTextColor={colors.mutedForeground}
          editable={!set.isCompleted}
          selectTextOnFocus
        />
      )}

      {isDistance && (
        <>
          <TextInput
            style={[styles.input, { color: set.isCompleted ? colors.success : colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={set.distance}
            onChangeText={(t) => onUpdate({ distance: t })}
            keyboardType="decimal-pad"
            placeholder="km"
            placeholderTextColor={colors.mutedForeground}
            editable={!set.isCompleted}
            selectTextOnFocus
          />
          <TextInput
            style={[styles.input, { color: set.isCompleted ? colors.success : colors.foreground, borderColor: colors.border, backgroundColor: colors.input }]}
            value={set.duration}
            onChangeText={(t) => onUpdate({ duration: t })}
            keyboardType="decimal-pad"
            placeholder="min"
            placeholderTextColor={colors.mutedForeground}
            editable={!set.isCompleted}
            selectTextOnFocus
          />
        </>
      )}

      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.checkBtn, { backgroundColor: set.isCompleted ? colors.success : colors.muted }]}
          onPress={toggleComplete}
        >
          <Feather name="check" size={16} color={set.isCompleted ? "#FFF" : colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, marginBottom: 6, gap: 8 },
  setNumContainer: { width: 24, alignItems: "center" },
  setNum: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  prev: { width: 70, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  input: { width: 60, height: 36, borderRadius: 8, borderWidth: 1, textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  inputWide: { flex: 1, height: 36, borderRadius: 8, borderWidth: 1, textAlign: "center", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  checkBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
