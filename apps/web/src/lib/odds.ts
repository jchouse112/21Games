import type { Sport } from "./sport";

export const LAMBDA_MLB = 4.6;
export const LAMBDA_NHL = 3.0;
export const LAMBDA_SOCCER = 1.35;
export const LAMBDA_NBA = 2.6;
export const LAMBDA = LAMBDA_MLB;

export function lambdaFor(sport: Sport): number {
  if (sport === "nhl") return LAMBDA_NHL;
  if (sport === "soccer") return LAMBDA_SOCCER;
  if (sport === "nba") return LAMBDA_NBA;
  return LAMBDA_MLB;
}

export const TARGET = 21;
export const ZONE_LOW = 15;
export const SOCCER_TARGET = 11;
export const SOCCER_ZONE_LOW = 8;
export const MLB_MIN_TEAMS = 3;
export const MLB_MAX_TEAMS = 6;
export const NHL_MIN_TEAMS = 4;
export const NHL_MAX_TEAMS = 8;
export const SOCCER_MIN_TEAMS = 5;
export const SOCCER_MAX_TEAMS = 9;
export const NBA_MIN_PLAYERS = 5;
export const NBA_MAX_PLAYERS = 8;
export const MIN_TEAMS = MLB_MIN_TEAMS;
export const MAX_TEAMS = MLB_MAX_TEAMS;

export function targetFor(sport: Sport): number {
  return sport === "soccer" ? SOCCER_TARGET : TARGET;
}

export function zoneLowFor(sport: Sport): number {
  return sport === "soccer" ? SOCCER_ZONE_LOW : ZONE_LOW;
}

export function pickLimitsFor(sport: Sport): { min: number; max: number } {
  if (sport === "nhl") return { min: NHL_MIN_TEAMS, max: NHL_MAX_TEAMS };
  if (sport === "soccer") {
    return { min: SOCCER_MIN_TEAMS, max: SOCCER_MAX_TEAMS };
  }
  if (sport === "nba") return { min: NBA_MIN_PLAYERS, max: NBA_MAX_PLAYERS };
  return { min: MLB_MIN_TEAMS, max: MLB_MAX_TEAMS };
}

export const BASE_POINTS: Record<number, number> = {
  15: 1,
  16: 2,
  17: 3,
  18: 5,
  19: 10,
  20: 15,
  21: 21,
};

export const SOCCER_BASE_POINTS: Record<number, number> = {
  8: 3,
  9: 5,
  10: 8,
  11: 11,
};

function basePointsMapFor(target: number): Record<number, number> {
  return target === SOCCER_TARGET ? SOCCER_BASE_POINTS : BASE_POINTS;
}

function basePointsForTotal(
  total: number,
  target: number,
  zoneLow: number,
): number {
  return basePointsMapFor(target)[total] ?? Math.max(1, total - zoneLow + 1);
}

export const TARGET_HOLD = 0.15;
export const BJ_BONUS = 1.3;
export const FLOOR_AT_15 = 0.75;
export const SCALE_MULT = 20;
export const GLOBAL_CAP = 2500;
export const HIT_COST_FRAC = 0.25;

export function committedRatio(hits: number): number {
  return 1 + HIT_COST_FRAC * Math.max(0, hits);
}

export function compensatedHold(ratio: number): number {
  if (ratio <= 0) return TARGET_HOLD;
  return 1 - (1 - TARGET_HOLD) / ratio;
}

export type HandStatus = "short" | "win" | "bj" | "bust";

export type PayoutRow = {
  total: number;
  basePoints: number;
  payout: number;
  isBj: boolean;
};

export type Outcome = {
  status: HandStatus;
  total: number;
  basePoints: number;
  payout: number;
};

export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || !Number.isFinite(k)) return 0;
  let logPmf = -lambda + k * Math.log(lambda);
  for (let i = 2; i <= k; i += 1) logPmf -= Math.log(i);
  return Math.exp(logPmf);
}

export function calibratedOdds(
  nTeams: number,
  lambda: number = LAMBDA_MLB,
  hold: number = TARGET_HOLD,
  target: number = TARGET,
  zoneLow: number = ZONE_LOW,
): number {
  const lam = lambda * nTeams;
  let weighted = 0;
  for (let t = zoneLow; t <= target; t += 1) {
    const p = poissonPmf(t, lam);
    const w = basePointsForTotal(t, target, zoneLow) / target;
    const b = t === target ? BJ_BONUS : 1;
    weighted += p * w * b;
  }
  return (1 - hold) / Math.max(weighted, 1e-4);
}

export function payoutCap(stake: number): number {
  return Math.min(stake * SCALE_MULT, GLOBAL_CAP);
}

export function payoutForTotal(
  nTeams: number,
  total: number,
  baseStake: number,
  lambda: number = LAMBDA_MLB,
  committedStake: number = baseStake,
  target: number = TARGET,
  zoneLow: number = ZONE_LOW,
): number {
  if (total < zoneLow || total > target) return 0;
  const ratio = baseStake > 0 ? committedStake / baseStake : 1;
  const hold = ratio > 1 ? compensatedHold(ratio) : TARGET_HOLD;
  const odds = calibratedOdds(nTeams, lambda, hold, target, zoneLow);
  const w = basePointsForTotal(total, target, zoneLow) / target;
  const b = total === target ? BJ_BONUS : 1;
  let raw = committedStake * odds * w * b;
  if (total === zoneLow) raw = Math.max(raw, committedStake * FLOOR_AT_15);
  return Math.min(raw, payoutCap(baseStake));
}

export function previewTable(
  nTeams: number,
  baseStake: number,
  lambda: number = LAMBDA_MLB,
  committedStake: number = baseStake,
  target: number = TARGET,
  zoneLow: number = ZONE_LOW,
): PayoutRow[] {
  const rows: PayoutRow[] = [];
  for (let t = zoneLow; t <= target; t += 1) {
    rows.push({
      total: t,
      basePoints: basePointsForTotal(t, target, zoneLow),
      payout: payoutForTotal(
        nTeams,
        t,
        baseStake,
        lambda,
        committedStake,
        target,
        zoneLow,
      ),
      isBj: t === target,
    });
  }
  return rows;
}

export function settleBet(
  nTeams: number,
  total: number,
  baseStake: number,
  lambda: number = LAMBDA_MLB,
  committedStake: number = baseStake,
  target: number = TARGET,
  zoneLow: number = ZONE_LOW,
): Outcome {
  if (total > target) {
    return { status: "bust", total, basePoints: 0, payout: 0 };
  }
  if (total < zoneLow) {
    return { status: "short", total, basePoints: 0, payout: 0 };
  }
  const payout = payoutForTotal(
    nTeams,
    total,
    baseStake,
    lambda,
    committedStake,
    target,
    zoneLow,
  );
  return {
    status: total === target ? "bj" : "win",
    total,
    basePoints: basePointsForTotal(total, target, zoneLow),
    payout,
  };
}

export function handProbabilities(
  nTeams: number,
  lambda: number = LAMBDA_MLB,
  target: number = TARGET,
  zoneLow: number = ZONE_LOW,
): {
  pZone: number;
  pBj: number;
  pBust: number;
  pShort: number;
} {
  const lam = lambda * nTeams;
  let pShort = 0;
  for (let t = 0; t < zoneLow; t += 1) pShort += poissonPmf(t, lam);
  let pZone = 0;
  for (let t = zoneLow; t <= target; t += 1) pZone += poissonPmf(t, lam);
  const pBj = poissonPmf(target, lam);
  const pBust = Math.max(0, 1 - pShort - pZone);
  return { pZone, pBj, pBust, pShort };
}
