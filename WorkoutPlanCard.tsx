import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WorkoutPlan } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  plan: WorkoutPlan;
  onPress: () => void;
  onStart: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export function WorkoutPlanCard({ plan, onPress, onStart, onDuplicate, onDelete }: Props) {
  const colors = useColors();
  const totalExercises = plan.days.reduce((acc, d) => acc + d.exercises.length, 0);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{plan.name}</Text>
          {plan.description ? (
            <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={1}>{plan.description}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primary }]}
          onPress={onStart}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Feather name="play" size={14} color="#FFF" />
          <Text style={styles.startText}>Start</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.days}>
        {plan.days.slice(0, 5).map((day) => (
          <View key={day.id} style={[styles.dayChip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.dayText, { color: colors.mutedForeground }]}>{day.name}</Text>
          </View>
        ))}
        {plan.days.length > 5 && (
          <View style={[styles.dayChip, { backgroundColor: colors.muted }]}>
            <Text style={[styles.dayText, { color: colors.mutedForeground }]}>+{plan.days.length - 5}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          {plan.days.length} day{plan.days.length !== 1 ? "s" : ""} · {totalExercises} exercises
          {plan.lastUsed ? ` · Last: ${timeAgo(plan.lastUsed)}` : ""}
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={onDuplicate}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Feather name="copy" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.actionBtn}
          >
            <Feather name="trash-2" size={16} color={colors.destructive} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  titleRow: { flex: 1 },
  name: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 2 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 13 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  startText: { fontFamily: "Inter_600SemiBold", fontSize: 13, color: "#FFF" },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 },
  dayChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  dayText: { fontFamily: "Inter_500Medium", fontSize: 12 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  meta: { fontFamily: "Inter_400Regular", fontSize: 12 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { padding: 2 },
});
