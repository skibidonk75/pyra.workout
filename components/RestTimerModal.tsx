const Haptics = { notificationAsync: () => {}, NotificationFeedbackType: { Success: null } };
import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  visible: boolean;
  duration: number;
  onDismiss: () => void;
}

export function RestTimerModal({ visible, duration, onDismiss }: Props) {
  const colors = useColors();
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setRemaining(duration);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [visible, duration]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = remaining / duration;

  const circumference = 2 * Math.PI * 60;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.mutedForeground }]}>REST TIMER</Text>

          <View style={styles.timerContainer}>
            <Text style={[styles.time, { color: remaining <= 10 ? colors.destructive : colors.foreground }]}>
              {mins}:{String(secs).padStart(2, "0")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {remaining > 0 ? "Rest up" : "Time!"}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressBg, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: remaining <= 10 ? colors.destructive : colors.primary,
                    width: `${progress * 100}%`,
                  },
                ]}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.skipBtn, { backgroundColor: colors.primary }]}
            onPress={onDismiss}
          >
            <Feather name="skip-forward" size={18} color="#FFF" />
            <Text style={styles.skipText}>Skip Rest</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 32, alignItems: "center", gap: 20, paddingBottom: 48 },
  title: { fontFamily: "Inter_700Bold", fontSize: 12, letterSpacing: 2 },
  timerContainer: { alignItems: "center" },
  time: { fontFamily: "Inter_700Bold", fontSize: 64 },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 16, marginTop: 4 },
  progressBar: { width: "100%" },
  progressBg: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 3 },
  skipBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 100 },
  skipText: { fontFamily: "Inter_700Bold", fontSize: 16, color: "#FFF" },
});
