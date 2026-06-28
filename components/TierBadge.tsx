import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { TierInfo } from "@/constants/tiers";
import { useColors } from "@/hooks/useColors";

interface Props {
  tier: TierInfo;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const TIER_ICONS: Record<string, string> = {
  Bronze: "🥉",
  Silver: "🥈",
  Gold: "🥇",
  Platinum: "💎",
  Diamond: "💠",
};

export function TierBadge({ tier, size = "md", showLabel = true }: Props) {
  const colors = useColors();
  const badgeSizes = { sm: 36, md: 56, lg: 80 };
  const fontSize = { sm: 16, md: 24, lg: 36 };
  const labelSize = { sm: 10, md: 12, lg: 14 };
  const dim = badgeSizes[size];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[tier.gradientStart, tier.gradientEnd]}
        style={[styles.badge, { width: dim, height: dim, borderRadius: dim / 2 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={{ fontSize: fontSize[size] }}>{TIER_ICONS[tier.tier]}</Text>
      </LinearGradient>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: tier.color, fontSize: labelSize[size] }]}>
            {tier.label}
          </Text>
          <Text style={[styles.desc, { color: colors.mutedForeground, fontSize: labelSize[size] - 2 }]}>
            {tier.description}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 6 },
  badge: { alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  labelContainer: { alignItems: "center", gap: 2 },
  label: { fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  desc: { fontFamily: "Inter_400Regular" },
});
