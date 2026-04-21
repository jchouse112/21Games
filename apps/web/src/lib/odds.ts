import type { Sport } from "./sport";

export const LAMBDA_MLB = 4.6;
export const LAMBDA_NHL = 3.0;
export const LAMBDA = LAMBDA_MLB;

export function lambdaFor(sport: Sport): number {
  return sport === "nhl" ? LAMBDA_NHL : LAMBDA_MLB;
}

export const TARGET = 21;
export const ZONE_LOW = 15;
export const MIN_TEAMS = 3;
export const MAX_TEAMS = 6;

export const BASE_POINTS: Record<number, number> = {
  15: 1,
  16: 2,
  17: 3,
  18: 5,
  19: 10,
  20: 15,
  21: 21,
};

export const TARGET_HOLD = 0.15;
export const BJ_BONUS = 1.3;
export const FLOOR_AT_15 = 0.75;
export const SCALE_MULT = 20;
export const GLOBAL_CAP = 2500;

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
): number {
  const lam = lambda * nTeams;
  let weighted = 0;
  for (let t = ZONE_LOW; t <= TARGET; t += 1) {
    const p = poissonPmf(t, lam);
    const w = BASE_POINTS[t]! / TARGET;
    const b = t === TARGET ? BJ_BONUS : 1;
    weighted += p * w * b;
  }
  return (1 - TARGET_HOLD) / Math.max(weighted, 1e-4);
}

export function payoutCap(stake: number): number {
  return Math.min(stake * SCALE_MULT, GLOBAL_CAP);
}

export function payoutForTotal(
  nTeams: number,
  total: number,
  stake: number,
  lambda: number = LAMBDA_MLB,
): number {
  if (total < ZONE_LOW || total > TARGET) return 0;
  const odds = calibratedOdds(nTeams, lambda);
  const w = BASE_POINTS[total]! / TARGET;
  const b = total === TARGET ? BJ_BONUS : 1;
  let raw = stake * odds * w * b;
  if (total === ZONE_LOW) raw = Math.max(raw, stake * FLOOR_AT_15);
  return Math.min(raw, payoutCap(stake));
}

export function previewTable(
  nTeams: number,
  stake: number,
  lambda: number = LAMBDA_MLB,
): PayoutRow[] {
  const rows: PayoutRow[] = [];
  for (let t = ZONE_LOW; t <= TARGET; t += 1) {
    rows.push({
      total: t,
      basePoints: BASE_POINTS[t]!,
      payout: payoutForTotal(nTeams, t, stake, lambda),
      isBj: t === TARGET,
    });
  }
  return rows;
}

export function settleBet(
  nTeams: number,
  total: number,
  stake: number,
  lambda: number = LAMBDA_MLB,
): Outcome {
  if (total > TARGET) {
    return { status: "bust", total, basePoints: 0, payout: 0 };
  }
  if (total < ZONE_LOW) {
    return { status: "short", total, basePoints: 0, payout: 0 };
  }
  const payout = payoutForTotal(nTeams, total, stake, lambda);
  return {
    status: total === TARGET ? "bj" : "win",
    total,
    basePoints: BASE_POINTS[total]!,
    payout,
  };
}

export function handProbabilities(
  nTeams: number,
  lambda: number = LAMBDA_MLB,
): {
  pZone: number;
  pBj: number;
  pBust: number;
  pShort: number;
} {
  const lam = lambda * nTeams;
  let pShort = 0;
  for (let t = 0; t < ZONE_LOW; t += 1) pShort += poissonPmf(t, lam);
  let pZone = 0;
  for (let t = ZONE_LOW; t <= TARGET; t += 1) pZone += poissonPmf(t, lam);
  const pBj = poissonPmf(TARGET, lam);
  const pBust = Math.max(0, 1 - pShort - pZone);
  return { pZone, pBj, pBust, pShort };
}
