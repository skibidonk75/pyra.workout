import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseCard } from "@/components/ExerciseCard";
import { CATEGORIES } from "@/constants/exercises";
import { useWorkout } from "@/context/WorkoutContext";
import { useColors } from "@/hooks/useColors";
import type { Exercise } from "@/constants/exercises";
import type { MuscleGroup } from "@/constants/exercises";

const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced"] as const;

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { exercises, addCustomExercise } = useWorkout();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");
  const [newMuscle, setNewMuscle] = useState<MuscleGroup>("Chest");
  const [newEquip, setNewEquip] = useState("Barbell");
  const [newNotes, setNewNotes] = useState("");
  const [newDiff, setNewDiff] = useState<"Beginner" | "Intermediate" | "Advanced">("Beginner");

  const filtered = useMemo(() => {
    return exercises.filter((e) => {
      const matchSearch =
        !search ||
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.primaryMuscle.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || e.category === category;
      return matchSearch && matchCat;
    });
  }, [exercises, search, category]);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  function handleCreate() {
    if (!newName.trim()) return;
    addCustomExercise({
      name: newName.trim(),
      primaryMuscle: newMuscle,
      secondaryMuscles: [],
      equipment: newEquip,
      difficulty: newDiff,
      category: "Custom",
      trackingType: "weight_reps",
      notes: newNotes,
    });
    setNewName("");
    setNewNotes("");
    setShowCreate(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.foreground }]}>Exercise Library</Text>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowCreate(true)}
          >
            <Feather name="plus" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search exercises..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: 8, paddingRight: 20 }}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.filterChip,
                {
                  backgroundColor: category === cat ? colors.primary : colors.muted,
                  borderColor: category === cat ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: category === cat ? "#FFF" : colors.mutedForeground },
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ExerciseCard
            exercise={item}
            onPress={() => router.push(`/exercise/${item.id}`)}
          />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: 100 + bottomPad }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="search" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No exercises found</Text>
          </View>
        }
        keyboardShouldPersistTaps="handled"
      />

      <Modal visible={showCreate} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
            <TouchableOpacity onPress={() => setShowCreate(false)}>
              <Text style={[styles.cancel, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Custom Exercise</Text>
            <TouchableOpacity onPress={handleCreate}>
              <Text style={[styles.save, { color: newName.trim() ? colors.primary : colors.mutedForeground }]}>Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Exercise name"
              placeholderTextColor={colors.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EQUIPMENT</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="e.g. Barbell, Dumbbell, Bodyweight"
              placeholderTextColor={colors.mutedForeground}
              value={newEquip}
              onChangeText={setNewEquip}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DIFFICULTY</Text>
            <View style={styles.chipRow}>
              {(["Beginner", "Intermediate", "Advanced"] as const).map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, { backgroundColor: newDiff === d ? colors.primary : colors.muted }]}
                  onPress={() => setNewDiff(d)}
                >
                  <Text style={[styles.chipText, { color: newDiff === d ? "#FFF" : colors.mutedForeground }]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NOTES</Text>
            <TextInput
              style={[styles.textArea, { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Optional notes..."
              placeholderTextColor={colors.mutedForeground}
              value={newNotes}
              onChangeText={setNewNotes}
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  title: { fontFamily: "Inter_700Bold", fontSize: 28 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, height: 44, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 15 },
  filterRow: { marginBottom: 8, marginLeft: -20, paddingLeft: 20 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterText: { fontFamily: "Inter_500Medium", fontSize: 13 },
  list: { paddingHorizontal: 20, paddingTop: 8 },
  empty: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontFamily: "Inter_600SemiBold", fontSize: 17 },
  cancel: { fontFamily: "Inter_400Regular", fontSize: 16 },
  save: { fontFamily: "Inter_600SemiBold", fontSize: 16 },
  modalContent: { padding: 20, gap: 8 },
  fieldLabel: { fontFamily: "Inter_600SemiBold", fontSize: 11, letterSpacing: 1, marginTop: 8 },
  textInput: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontFamily: "Inter_400Regular", fontSize: 15 },
  textArea: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: "Inter_400Regular", fontSize: 15, minHeight: 100, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  chipText: { fontFamily: "Inter_500Medium", fontSize: 13 },
});
