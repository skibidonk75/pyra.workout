import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompletedWorkout, LoggedExercise, LoggedSet, useWorkout } from "@/context/WorkoutContext";
import { BUILT_IN_EXERCISES } from "@/constants/exercises";
import { useColors } from "@/hooks/useColors";

type ParsedWorkout = Omit<CompletedWorkout, "id"> & {
  _parseWarnings: string[];
  _isDuplicate: boolean;
  _selected: boolean;
};

const MONTH_MAP: Record<string, number> = {
  january: 0, jan: 0, february: 1, feb: 1, march: 2, mar: 2,
  april: 3, apr: 3, may: 4, june: 5, jun: 5, july: 6, jul: 6,
  august: 7, aug: 7, september: 8, sep: 8, sept: 8, october: 9, oct: 9,
  november: 10, nov: 10, december: 11, dec: 11,
};

function parseDate(line: string): Date | null {
  line = line.trim().replace(/[*_#]/g, "").trim();

  // ISO: 2024-01-15
  let m = line.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));

  // Month Day, Year: January 15, 2024 / Jan 15 2024
  m = line.match(/\b([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?[,\s]+(\d{4})\b/);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(m[3]), month, parseInt(m[2]));
  }

  // Month Day (no year): January 15 / Jan 15
  m = line.match(/^([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/i);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month !== undefined) return new Date(new Date().getFullYear(), month, parseInt(m[2]));
  }

  // Weekday, Month Day Year: Monday, January 15, 2024
  m = line.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*,?\s+([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i);
  if (m) {
    const month = MONTH_MAP[m[1].toLowerCase()];
    if (month !== undefined) return new Date(parseInt(m[3]), month, parseInt(m[2]));
  }

  // MM/DD/YYYY or M/D/YY
  m = line.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    const year = m[3].length === 2 ? 2000 + parseInt(m[3]) : parseInt(m[3]);
    const month = parseInt(m[1]) - 1;
    const day = parseInt(m[2]);
    if (month >= 0 && month < 12 && day >= 1 && day <= 31) {
      return new Date(year, month, day);
    }
  }

  return null;
}

function isDateLine(line: string): boolean {
  const clean = line.replace(/[*_#\-]/g, " ").trim();
  if (parseDate(clean)) return true;
  // Workout headers like "Workout - Tuesday" or "Day 1" etc.
  if (/^(workout|training|session|day\s*\d)/i.test(clean) && clean.length < 60) return true;
  return false;
}

function parseWeightReps(token: string): { weight?: number; reps?: number; sets?: number } | null {
  // "3x8@100kg" or "3x8 @ 100" or "100kg x 8"
  let m = token.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+)\s*@?\s*(\d+(?:\.\d+)?)\s*(?:kg|lb|lbs)?/i);
  if (m) return { sets: parseInt(m[1]), reps: parseInt(m[2]), weight: parseFloat(m[3]) };

  // "3 sets x 8 reps @ 100" or "3 sets × 8"
  m = token.match(/(\d+)\s*sets?\s*[x×]\s*(\d+)\s*(?:reps?)?\s*(?:@|at|@)?\s*(\d+(?:\.\d+)?)?/i);
  if (m) return { sets: parseInt(m[1]), reps: parseInt(m[2]), weight: m[3] ? parseFloat(m[3]) : undefined };

  // "100kg x 8" or "100 x 8"
  m = token.match(/(\d+(?:\.\d+)?)\s*(?:kg|lb|lbs)?\s*[x×]\s*(\d+)\s*(?:reps?)?/i);
  if (m) return { weight: parseFloat(m[1]), reps: parseInt(m[2]) };

  // "8 reps" or "8x" bare
  m = token.match(/^(\d+)\s*(?:reps?|x)$/i);
  if (m) return { reps: parseInt(m[1]) };

  return null;
}

function extractSetsFromLine(line: string): Array<{ weight?: number; reps?: number }> {
  const sets: Array<{ weight?: number; reps?: number }> = [];

  // Try comma-separated sets: "100kg x 8, 105kg x 8, 110kg x 6"
  const commaSegments = line.split(",").map((s) => s.trim()).filter(Boolean);
  if (commaSegments.length > 1) {
    for (const seg of commaSegments) {
      const p = parseWeightReps(seg);
      if (p) {
        if (p.sets && p.sets > 1) {
          for (let i = 0; i < p.sets; i++) sets.push({ weight: p.weight, reps: p.reps });
        } else {
          sets.push({ weight: p.weight, reps: p.reps });
        }
      }
    }
    if (sets.length > 0) return sets;
  }

  // Single set/group
  const p = parseWeightReps(line);
  if (p) {
    const count = p.sets && p.sets > 1 ? p.sets : 1;
    for (let i = 0; i < count; i++) sets.push({ weight: p.weight, reps: p.reps });
  }

  return sets;
}

function matchExerciseName(name: string): string | null {
  const normalized = name.toLowerCase().replace(/[^a-z0-9\s]/g, "").trim();
  // Exact match
  const exact = BUILT_IN_EXERCISES.find((e) => e.name.toLowerCase() === normalized);
  if (exact) return exact.id;
  // Contains match
  const contains = BUILT_IN_EXERCISES.find(
    (e) =>
      e.name.toLowerCase().includes(normalized) ||
      normalized.includes(e.name.toLowerCase())
  );
  if (contains) return contains.id;
  // Word overlap (at least 2 words match)
  const words = normalized.split(/\s+/).filter((w) => w.length > 2);
  if (words.length >= 2) {
    const wordMatch = BUILT_IN_EXERCISES.find((e) => {
      const eWords = e.name.toLowerCase().split(/\s+/);
      const overlap = words.filter((w) => eWords.some((ew) => ew.includes(w) || w.includes(ew)));
      return overlap.length >= Math.min(2, words.length);
    });
    if (wordMatch) return wordMatch.id;
  }
  return null;
}

const EXERCISE_LINE_RE = /^[-•*\s]*(.+?)(?:\s*[:\-–]?\s*)(\d.*)?$/;
const WEIGHT_RE = /\d+(?:\.\d+)?\s*(?:kg|lb|lbs|x|×|\*)/i;

function isExerciseLine(line: string): boolean {
  if (line.trim().length < 3) return false;
  if (isDateLine(line)) return false;
  // Has weight/reps pattern
  if (WEIGHT_RE.test(line)) return true;
  // Looks like a known exercise name
  const clean = line.replace(/^[-•*\s]+/, "").split(/[:\-–]/)[0].trim();
  if (clean.length > 2 && matchExerciseName(clean)) return true;
  return false;
}

function parseWorkoutText(text: string, existingHistory: CompletedWorkout[]): {
  workouts: ParsedWorkout[];
  totalWarnings: string[];
} {
  const lines = text.split("\n").map((l) => l.trimEnd());
  const totalWarnings: string[] = [];
  const workouts: ParsedWorkout[] = [];

  // Find workout boundaries by looking for date lines or headers
  const blocks: { startLine: number; date: Date | null; label: string }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    if (isDateLine(line)) {
      const d = parseDate(line.replace(/^[-•*#\s]+/, "").trim());
      blocks.push({ startLine: i, date: d, label: line });
    }
  }

  // If no date blocks found, treat entire text as one workout
  if (blocks.length === 0 && text.trim().length > 0) {
    blocks.push({ startLine: 0, date: new Date(), label: "Imported Workout" });
  }

  const existingDates = new Set(existingHistory.map((w) => new Date(w.startTime).toDateString()));

  for (let bi = 0; bi < blocks.length; bi++) {
    const block = blocks[bi];
    const nextStart = bi + 1 < blocks.length ? blocks[bi + 1].startLine : lines.length;
    const blockLines = lines.slice(block.startLine + 1, nextStart).filter((l) => l.trim());

    const workoutDate = block.date ?? new Date();
    const startTime = workoutDate.setHours(9, 0, 0, 0) ? workoutDate.getTime() : Date.now();
    const warnings: string[] = [];

    // Derive workout name from label
    const workoutName = block.label
      .replace(/^[-•*#\s]+/, "")
      .replace(/\s*\d{4}\s*$/, "")
      .trim() || "Workout";

    const loggedExercises: LoggedExercise[] = [];
    let currentExerciseName = "";
    let currentExerciseId: string | null = null;
    let currentSets: LoggedSet[] = [];

    function flushExercise() {
      if (currentExerciseId && currentSets.length > 0) {
        loggedExercises.push({
          id: `imp_${Date.now()}_${loggedExercises.length}`,
          exerciseId: currentExerciseId,
          sets: currentSets,
          notes: "",
        });
      } else if (currentExerciseName && currentSets.length === 0) {
        warnings.push(`No sets found for: "${currentExerciseName}"`);
      }
      currentSets = [];
    }

    for (const line of blockLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Check if this is a new exercise name line (no weight pattern, or starts with exercise)
      const cleanLine = trimmed.replace(/^[-•*\s]+/, "");
      const colonIdx = cleanLine.indexOf(":");
      const nameCandidate = colonIdx > 0 ? cleanLine.slice(0, colonIdx).trim() : cleanLine.split(/\s+\d/)[0].trim();
      const exerciseId = matchExerciseName(nameCandidate);

      if (exerciseId && exerciseId !== currentExerciseId) {
        flushExercise();
        currentExerciseName = nameCandidate;
        currentExerciseId = exerciseId;
        // Try to parse sets from the rest of the line (after the colon)
        const rest = colonIdx > 0 ? cleanLine.slice(colonIdx + 1).trim() : cleanLine.slice(nameCandidate.length).trim();
        if (rest && WEIGHT_RE.test(rest)) {
          const parsed = extractSetsFromLine(rest);
          for (const s of parsed) {
            currentSets.push({
              id: `s_${Date.now()}_${currentSets.length}`,
              weight: s.weight ?? null,
              reps: s.reps ?? null,
              duration: null,
              distance: null,
              isCompleted: true,
            });
          }
        }
      } else if (WEIGHT_RE.test(trimmed) && currentExerciseId) {
        // Additional sets for current exercise
        const parsed = extractSetsFromLine(trimmed);
        for (const s of parsed) {
          currentSets.push({
            id: `s_${Date.now()}_${currentSets.length}`,
            weight: s.weight ?? null,
            reps: s.reps ?? null,
            duration: null,
            distance: null,
            isCompleted: true,
          });
        }
      } else if (!exerciseId && !WEIGHT_RE.test(trimmed) && trimmed.length > 3 && !isDateLine(trimmed)) {
        warnings.push(`Couldn't parse: "${trimmed}"`);
      }
    }
    flushExercise();

    if (loggedExercises.length === 0) continue;

    const totalVolume = loggedExercises.reduce(
      (sum, e) => sum + e.sets.reduce((s, set) => s + (set.weight ?? 0) * (set.reps ?? 0), 0),
      0
    );
    const totalSets = loggedExercises.reduce((s, e) => s + e.sets.filter((set) => set.isCompleted).length, 0);
    const totalReps = loggedExercises.reduce((s, e) => s + e.sets.reduce((sum, set) => sum + (set.reps ?? 0), 0), 0);

    const isDuplicate = existingDates.has(new Date(startTime).toDateString());

    workouts.push({
      name: workoutName,
      planId: undefined,
      startTime,
      endTime: startTime + 3600000,
      duration: 3600,
      exercises: loggedExercises,
      totalVolume: Math.round(totalVolume),
      totalSets,
      totalReps,
      notes: "",
      _parseWarnings: warnings,
      _isDuplicate: isDuplicate,
      _selected: !isDuplicate,
    });

    if (warnings.length > 0) {
      totalWarnings.push(...warnings.map((w) => `[${workoutName}] ${w}`));
    }
  }

  return { workouts, totalWarnings };
}

type Step = "input" | "preview";

export default function ImportScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { importWorkouts, workoutHistory } = useWorkout();

  const [step, setStep] = useState<Step>("input");
  const [text, setText] = useState("");
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedWorkout[]>([]);
  const [allWarnings, setAllWarnings] = useState<string[]>([]);
  const [showWarnings, setShowWarnings] = useState(false);

  const topInset = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  function handleParse() {
    if (!text.trim()) {
      Alert.alert("No text", "Please paste your workout notes first.");
      return;
    }
    setParsing(true);
    setTimeout(() => {
      const { workouts, totalWarnings } = parseWorkoutText(text, workoutHistory);
      setParsed(workouts.map((w) => ({ ...w })));
      setAllWarnings(totalWarnings);
      setParsing(false);
      if (workouts.length === 0) {
        Alert.alert("Nothing found", "Couldn't detect any workouts in the text. Check the format and try again.");
        return;
      }
      setStep("preview");
    }, 100);
  }

  function toggleSelect(idx: number) {
    setParsed((prev) => prev.map((w, i) => (i === idx ? { ...w, _selected: !w._selected } : w)));
  }

  function handleImport() {
    const selected = parsed.filter((w) => w._selected);
    if (selected.length === 0) {
      Alert.alert("Nothing selected", "Select at least one workout to import.");
      return;
    }
    Alert.alert(
      "Import Workouts",
      `Import ${selected.length} workout${selected.length !== 1 ? "s" : ""} into Pyra?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          onPress: () => {
            importWorkouts(selected.map(({ _parseWarnings, _isDuplicate, _selected, ...w }) => w));
            Alert.alert("Imported!", `${selected.length} workout${selected.length !== 1 ? "s" : ""} added to your history.`);
            router.back();
          },
        },
      ]
    );
  }

  const selectedCount = parsed.filter((w) => w._selected).length;

  if (step === "preview") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setStep("input")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>
            {selectedCount} of {parsed.length} selected
          </Text>
          <TouchableOpacity
            style={[styles.importBtn, { backgroundColor: selectedCount > 0 ? colors.primary : colors.muted }]}
            onPress={handleImport}
            disabled={selectedCount === 0}
          >
            <Text style={[styles.importBtnText, { color: selectedCount > 0 ? "#FFF" : colors.mutedForeground }]}>
              Import
            </Text>
          </TouchableOpacity>
        </View>

        {allWarnings.length > 0 && (
          <TouchableOpacity
            style={[styles.warningBanner, { backgroundColor: colors.warning + "22", borderColor: colors.warning }]}
            onPress={() => setShowWarnings(!showWarnings)}
          >
            <Feather name="alert-triangle" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.warning }]}>
              {allWarnings.length} line{allWarnings.length !== 1 ? "s" : ""} couldn't be parsed. Tap to {showWarnings ? "hide" : "view"}.
            </Text>
          </TouchableOpacity>
        )}

        {showWarnings && allWarnings.length > 0 && (
          <View style={[styles.warningList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {allWarnings.slice(0, 10).map((w, i) => (
              <Text key={i} style={[styles.warningItem, { color: colors.mutedForeground }]}>• {w}</Text>
            ))}
            {allWarnings.length > 10 && (
              <Text style={[styles.warningItem, { color: colors.mutedForeground }]}>
                …and {allWarnings.length - 10} more
              </Text>
            )}
          </View>
        )}

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: insets.bottom + 40 }}>
          {parsed.map((w, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.previewCard,
                {
                  backgroundColor: colors.card,
                  borderColor: w._selected ? colors.primary : colors.border,
                  borderWidth: w._selected ? 2 : 1,
                  opacity: w._isDuplicate && !w._selected ? 0.6 : 1,
                },
              ]}
              onPress={() => toggleSelect(idx)}
              activeOpacity={0.8}
            >
              <View style={styles.previewCardHeader}>
                <View style={styles.previewCheckbox}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: w._selected ? colors.primary : colors.border },
                      w._selected && { backgroundColor: colors.primary },
                    ]}
                  >
                    {w._selected && <Feather name="check" size={12} color="#FFF" />}
                  </View>
                  <View>
                    <Text style={[styles.previewName, { color: colors.foreground }]}>{w.name}</Text>
                    <Text style={[styles.previewDate, { color: colors.mutedForeground }]}>
                      {new Date(w.startTime).toLocaleDateString("en", {
                        weekday: "short", month: "short", day: "numeric", year: "numeric",
                      })}
                    </Text>
                  </View>
                </View>
                {w._isDuplicate && (
                  <View style={[styles.dupTag, { backgroundColor: colors.warning + "22" }]}>
                    <Text style={[styles.dupText, { color: colors.warning }]}>Duplicate</Text>
                  </View>
                )}
              </View>

              <View style={styles.previewStats}>
                <Text style={[styles.previewStat, { color: colors.mutedForeground }]}>
                  {w.exercises.length} exercise{w.exercises.length !== 1 ? "s" : ""}
                </Text>
                <Text style={[styles.previewStat, { color: colors.mutedForeground }]}>·</Text>
                <Text style={[styles.previewStat, { color: colors.mutedForeground }]}>{w.totalSets} sets</Text>
                {w.totalVolume > 0 && (
                  <>
                    <Text style={[styles.previewStat, { color: colors.mutedForeground }]}>·</Text>
                    <Text style={[styles.previewStat, { color: colors.mutedForeground }]}>{w.totalVolume}kg vol</Text>
                  </>
                )}
              </View>

              {w.exercises.slice(0, 3).map((e, ei) => {
                const ex = BUILT_IN_EXERCISES.find((b) => b.id === e.exerciseId);
                return (
                  <Text key={ei} style={[styles.previewExercise, { color: colors.foreground }]}>
                    {ex?.name ?? e.exerciseId} ×{" "}
                    {e.sets.map((s) => (s.reps ?? "?")).join(", ")} reps
                    {e.sets[0]?.weight ? ` @ ${e.sets[0].weight}kg` : ""}
                  </Text>
                );
              })}
              {w.exercises.length > 3 && (
                <Text style={[styles.previewMore, { color: colors.mutedForeground }]}>
                  +{w.exercises.length - 3} more…
                </Text>
              )}
              {w._parseWarnings.length > 0 && (
                <View style={[styles.cardWarnings, { borderTopColor: colors.border }]}>
                  {w._parseWarnings.slice(0, 2).map((warn, wi) => (
                    <Text key={wi} style={[styles.cardWarningText, { color: colors.warning }]}>⚠ {warn}</Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Import Data</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Paste Your Workout Notes</Text>
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            Paste text from Notes, Google Docs, or any format. Pyra will detect dates, exercises, sets, reps, and weight automatically.
          </Text>
        </View>

        <View style={[styles.formatCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formatTitle, { color: colors.foreground }]}>Supported formats</Text>
          {[
            "March 15, 2024\nBench Press: 3x8 @ 100kg\nSquat: 4x6 @ 120kg",
            "2024-01-15\n- Bench Press 100kg x 8 reps x 3 sets",
            "January 15\nBench: 100 x 8, 100 x 8, 105 x 6",
          ].map((ex, i) => (
            <View key={i} style={[styles.formatExample, { backgroundColor: colors.input, borderColor: colors.border }]}>
              <Text style={[styles.formatCode, { color: colors.mutedForeground }]}>{ex}</Text>
            </View>
          ))}
        </View>

        <TextInput
          style={[
            styles.textArea,
            { backgroundColor: colors.input, borderColor: colors.border, color: colors.foreground },
          ]}
          multiline
          numberOfLines={14}
          textAlignVertical="top"
          placeholder={"Paste your workout notes here...\n\nExample:\nMarch 15, 2024\nBench Press: 3x8 @ 100kg\nSquat: 120kg x 6 x 4 sets\n\nMarch 17, 2024\nDeadlift: 140kg x 5\nPull-ups: 3x10"}
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
        />

        <TouchableOpacity
          style={[styles.parseBtn, { backgroundColor: parsing ? colors.muted : colors.primary }]}
          onPress={handleParse}
          disabled={parsing}
        >
          {parsing ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Feather name="zap" size={18} color="#FFF" />
              <Text style={styles.parseBtnText}>Parse & Preview</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  importBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  importBtnText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 20, marginBottom: 8 },
  hint: { fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  formatCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  formatTitle: { fontFamily: "Inter_600SemiBold", fontSize: 14, marginBottom: 4 },
  formatExample: { borderRadius: 8, borderWidth: 1, padding: 10 },
  formatCode: { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 12, lineHeight: 18 },
  textArea: { borderRadius: 14, borderWidth: 1, padding: 14, minHeight: 200, fontFamily: "Inter_400Regular", fontSize: 14, lineHeight: 22 },
  parseBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: 16 },
  parseBtnText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFF" },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, margin: 16, marginBottom: 0, padding: 12, borderRadius: 10, borderWidth: 1 },
  warningText: { fontFamily: "Inter_500Medium", fontSize: 13, flex: 1 },
  warningList: { marginHorizontal: 16, marginTop: 8, borderRadius: 10, borderWidth: 1, padding: 12, gap: 4 },
  warningItem: { fontFamily: "Inter_400Regular", fontSize: 12, lineHeight: 18 },
  previewCard: { borderRadius: 16, padding: 14, gap: 8 },
  previewCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  previewCheckbox: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  previewName: { fontFamily: "Inter_700Bold", fontSize: 15 },
  previewDate: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 1 },
  dupTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dupText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  previewStats: { flexDirection: "row", alignItems: "center", gap: 6 },
  previewStat: { fontFamily: "Inter_400Regular", fontSize: 13 },
  previewExercise: { fontFamily: "Inter_500Medium", fontSize: 13 },
  previewMore: { fontFamily: "Inter_400Regular", fontSize: 12 },
  cardWarnings: { borderTopWidth: 1, paddingTop: 8, gap: 3 },
  cardWarningText: { fontFamily: "Inter_400Regular", fontSize: 12 },
});
