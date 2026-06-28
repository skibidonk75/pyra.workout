export type TierName = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";
export type TierLevel = 1 | 2 | 3;

export interface TierInfo {
  tier: TierName;
  level: TierLevel;
  minWorkouts: number;
  maxWorkouts: number | null;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  label: string;
  description: string;
}

export const TIERS: TierInfo[] = [
  {
    tier: "Bronze", level: 1, minWorkouts: 0, maxWorkouts: 10,
    color: "#CD7F32", gradientStart: "#8B5E3C", gradientEnd: "#CD7F32",
    label: "Bronze I", description: "Just getting started",
  },
  {
    tier: "Bronze", level: 2, minWorkouts: 10, maxWorkouts: 25,
    color: "#CD7F32", gradientStart: "#A0652A", gradientEnd: "#E8A56A",
    label: "Bronze II", description: "Building the habit",
  },
  {
    tier: "Bronze", level: 3, minWorkouts: 25, maxWorkouts: 50,
    color: "#CD7F32", gradientStart: "#B87333", gradientEnd: "#F4C896",
    label: "Bronze III", description: "Consistency forming",
  },
  {
    tier: "Silver", level: 1, minWorkouts: 50, maxWorkouts: 75,
    color: "#A8A9AD", gradientStart: "#707070", gradientEnd: "#A8A9AD",
    label: "Silver I", description: "Solid foundation",
  },
  {
    tier: "Silver", level: 2, minWorkouts: 75, maxWorkouts: 100,
    color: "#A8A9AD", gradientStart: "#909090", gradientEnd: "#DCDCDC",
    label: "Silver II", description: "Serious athlete",
  },
  {
    tier: "Silver", level: 3, minWorkouts: 100, maxWorkouts: 150,
    color: "#A8A9AD", gradientStart: "#B0B0B0", gradientEnd: "#F0F0F0",
    label: "Silver III", description: "Dedicated lifter",
  },
  {
    tier: "Gold", level: 1, minWorkouts: 150, maxWorkouts: 200,
    color: "#FFD700", gradientStart: "#B8860B", gradientEnd: "#FFD700",
    label: "Gold I", description: "Elite commitment",
  },
  {
    tier: "Gold", level: 2, minWorkouts: 200, maxWorkouts: 300,
    color: "#FFD700", gradientStart: "#DAA520", gradientEnd: "#FFF176",
    label: "Gold II", description: "Unstoppable",
  },
  {
    tier: "Gold", level: 3, minWorkouts: 300, maxWorkouts: 400,
    color: "#FFD700", gradientStart: "#FFC200", gradientEnd: "#FFF9C4",
    label: "Gold III", description: "Legendary discipline",
  },
  {
    tier: "Platinum", level: 1, minWorkouts: 400, maxWorkouts: 500,
    color: "#9FA8B0", gradientStart: "#6E7F8A", gradientEnd: "#C5CDD4",
    label: "Platinum I", description: "Among the best",
  },
  {
    tier: "Platinum", level: 2, minWorkouts: 500, maxWorkouts: 750,
    color: "#9FA8B0", gradientStart: "#8E9EA8", gradientEnd: "#D8E4EA",
    label: "Platinum II", description: "True champion",
  },
  {
    tier: "Platinum", level: 3, minWorkouts: 750, maxWorkouts: 1000,
    color: "#9FA8B0", gradientStart: "#A8B8C2", gradientEnd: "#EBF4F8",
    label: "Platinum III", description: "World class",
  },
  {
    tier: "Diamond", level: 1, minWorkouts: 1000, maxWorkouts: 1250,
    color: "#67E8F9", gradientStart: "#06B6D4", gradientEnd: "#A5F3FC",
    label: "Diamond I", description: "Beyond elite",
  },
  {
    tier: "Diamond", level: 2, minWorkouts: 1250, maxWorkouts: 1500,
    color: "#67E8F9", gradientStart: "#22D3EE", gradientEnd: "#CFFAFE",
    label: "Diamond II", description: "Living legend",
  },
  {
    tier: "Diamond", level: 3, minWorkouts: 1500, maxWorkouts: null,
    color: "#67E8F9", gradientStart: "#00B4D8", gradientEnd: "#E0F7FA",
    label: "Diamond III", description: "The pinnacle",
  },
];

export function getCurrentTier(workoutCount: number): TierInfo {
  let current = TIERS[0];
  for (const t of TIERS) {
    if (workoutCount >= t.minWorkouts) current = t;
  }
  return current;
}

export function getNextTier(workoutCount: number): TierInfo | null {
  const current = getCurrentTier(workoutCount);
  const idx = TIERS.findIndex(t => t.label === current.label);
  return idx < TIERS.length - 1 ? TIERS[idx + 1] : null;
}

export function getTierProgress(workoutCount: number): number {
  const current = getCurrentTier(workoutCount);
  const next = getNextTier(workoutCount);
  if (!next) return 1;
  const range = next.minWorkouts - current.minWorkouts;
  return Math.min((workoutCount - current.minWorkouts) / range, 1);
}
