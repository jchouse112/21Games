export type DevUser = {
  id: string;
  handle: string;
};

export type UserState = {
  balance: number;
  createdAt: string;
  lastRefillEtDate?: string;
};

export type Tier = "Basement" | "Ground" | "Main Floor" | "Penthouse";

export type TierLevel = {
  tier: Tier;
  minBalance: number;
  stakes: number[];
};

export const DEV_USERS: DevUser[] = [
  { id: "alice", handle: "Alice" },
  { id: "bob", handle: "Bob" },
  { id: "carl", handle: "Carl" },
  { id: "dina", handle: "Dina" },
  { id: "eli", handle: "Eli" },
];

export const DEFAULT_BALANCE = 100;
export const MIN_STAKE = 1;
export const REFILL_AMOUNT = 10;

export const TIER_LEVELS: TierLevel[] = [
  { tier: "Basement", minBalance: 0, stakes: [1] },
  { tier: "Ground", minBalance: 10, stakes: [1, 2] },
  { tier: "Main Floor", minBalance: 100, stakes: [1, 2, 5, 10] },
  { tier: "Penthouse", minBalance: 2000, stakes: [1, 2, 5, 10, 25] },
];

export function getTier(balance: number): Tier {
  if (balance < 10) return "Basement";
  if (balance < 100) return "Ground";
  if (balance < 2000) return "Main Floor";
  return "Penthouse";
}

export function getAvailableStakes(balance: number): number[] {
  if (balance < 10) return [1];
  if (balance < 100) return [1, 2];
  if (balance < 2000) return [1, 2, 5, 10];
  return [1, 2, 5, 10, 25];
}

export function getTierProgress(balance: number): {
  current: TierLevel;
  next: TierLevel | null;
  remaining: number;
  percent: number;
} {
  const current = [...TIER_LEVELS]
    .reverse()
    .find((level) => balance >= level.minBalance) ?? TIER_LEVELS[0]!;
  const currentIndex = TIER_LEVELS.findIndex((level) => level.tier === current.tier);
  const next = TIER_LEVELS[currentIndex + 1] ?? null;
  if (!next) return { current, next, remaining: 0, percent: 100 };

  const span = Math.max(1, next.minBalance - current.minBalance);
  const earned = Math.max(0, balance - current.minBalance);
  const percent = Math.min(100, Math.max(0, (earned / span) * 100));
  return {
    current,
    next,
    remaining: Math.max(0, next.minBalance - balance),
    percent,
  };
}
