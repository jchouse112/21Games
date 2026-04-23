import type { Sport } from "./sport";

export type BetStatus = "open" | "settled";

export type BetTeam = {
  id: number;
  abbr: string;
  name: string;
  gameId: string;
  startsAtIso?: string;
};

export type BetHit = {
  at: string;
  team: BetTeam;
};

export type Bet = {
  id: string;
  userId: string;
  sport: Sport;
  slateDate: string;
  teams: BetTeam[];
  stake: number;
  baseStake: number;
  hits: BetHit[];
  status: BetStatus;
  createdAt: string;
  settledAt?: string;
  outcome?: {
    status: "short" | "win" | "bj" | "bust";
    total: number;
    basePoints: number;
    payout: number;
  };
};

export const BETS_KEY_PREFIX = "play21.bets.";

export function betsStorageKey(userId: string): string {
  return BETS_KEY_PREFIX + userId;
}

export function generateBetId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `bet-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
