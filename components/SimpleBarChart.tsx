import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface DataPoint { label: string; value: number; }

interface Props {
  data: DataPoint[];
  height?: number;
  barColor?: string;
  unit?: string;
}

function formatValue(v: number): string {
  if (v >= 1000000) return `${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(Math.round(v));
}

export function SimpleBarChart({ data, height = 120, barColor, unit = "" }: Props) {
  const colors = useColors();
  const max = Math.max(...data.map((d) => d.value), 1);
  const accent = barColor ?? colors.primary;

  return (
    <View style={styles.container}>
      <View style={[styles.chart, { height }]}>
        {data.map((d, i) => {
          const barH = (d.value / max) * (height - 24);
          return (
            <View key={i} style={styles.barWrapper}>
              {d.value > 0 && (
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                  {formatValue(d.value)}
                </Text>
              )}
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: barH,
                      backgroundColor: accent,
                      opacity: d.value === 0 ? 0.2 : 1,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.xLabel, { color: colors.mutedForeground }]}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  chart: { flexDirection: "row", alignItems: "flex-end", gap: 4 },
  barWrapper: { flex: 1, alignItems: "center", justifyContent: "flex-end" },
  barTrack: { width: "80%", alignItems: "center" },
  bar: { width: "100%", borderRadius: 4, minHeight: 2 },
  barLabel: { fontFamily: "Inter_400Regular", fontSize: 9, marginBottom: 2 },
  labels: { flexDirection: "row", marginTop: 6, gap: 4 },
  xLabel: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 10, textAlign: "center" },
});
