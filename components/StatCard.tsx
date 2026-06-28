import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: string;
}

export function StatCard({ label, value, subtitle, icon, accent }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {icon && <View style={styles.iconRow}>{icon}</View>}
      <Text style={[styles.value, { color: accent ?? colors.primary }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 16, alignItems: "center", gap: 4, minWidth: 100 },
  iconRow: { marginBottom: 4 },
  value: { fontFamily: "Inter_700Bold", fontSize: 22 },
  label: { fontFamily: "Inter_500Medium", fontSize: 13, textAlign: "center" },
  subtitle: { fontFamily: "Inter_400Regular", fontSize: 11, textAlign: "center" },
});
