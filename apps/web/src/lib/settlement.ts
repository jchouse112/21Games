import type { ScheduleResponse } from "./mlb";
import type { NhlScoreResponse } from "./nhl";
import type { Bet } from "./bets";
import { lambdaFor, settleBet as settleBetOdds, type Outcome } from "./odds";

export type GameStatus = "scheduled" | "live" | "final" | "voided";

export type TeamScore = {
  teamId: number;
  gamePk: number;
  runs: number;
  status: GameStatus;
  inning: number | null;
  inningOrdinal: string | null;
  inningHalf: string | null;
  period?: number | null;
  periodClock?: string | null;
};

export type RunsMap = Map<number, TeamScore>;

export function classifyStatus(detailedState?: string): GameStatus {
  const s = (detailedState ?? "").toLowerCase();
  if (!s) return "scheduled";
  if (s.includes("postponed") || s.includes("cancelled") || s.includes("canceled")) {
    return "voided";
  }
  if (s === "final" || s.includes("game over") || s.includes("completed early")) {
    return "final";
  }
  if (s === "scheduled" || s.includes("pre-game") || s.includes("warmup")) {
    return "scheduled";
  }
  return "live";
}

export function extractRunsMap(schedule: ScheduleResponse): RunsMap {
  const map: RunsMap = new Map();
  const games = schedule.dates?.[0]?.games ?? [];
  for (const g of games) {
    if ((g.gameNumber ?? 1) > 1) continue;
    const status = classifyStatus(g.status?.detailedState);
    const ls = g.linescore;
    const inning = ls?.currentInning ?? null;
    const inningOrdinal = ls?.currentInningOrdinal ?? null;
    const inningHalf = ls?.inningHalf ?? null;
    const awayId = g.teams.away.team.id;
    const homeId = g.teams.home.team.id;
    const awayRuns = ls?.teams?.away?.runs ?? g.teams.away.score ?? 0;
    const homeRuns = ls?.teams?.home?.runs ?? g.teams.home.score ?? 0;
    map.set(awayId, {
      teamId: awayId,
      gamePk: g.gamePk,
      runs: status === "scheduled" ? 0 : awayRuns,
      status,
      inning,
      inningOrdinal,
      inningHalf,
    });
    map.set(homeId, {
      teamId: homeId,
      gamePk: g.gamePk,
      runs: status === "scheduled" ? 0 : homeRuns,
      status,
      inning,
      inningOrdinal,
      inningHalf,
    });
  }
  return map;
}

export type BetProgress = {
  perTeam: Array<{
    teamId: number;
    score: TeamScore | null;
  }>;
  liveTotal: number;
  allFinalOrVoided: boolean;
  anyVoided: boolean;
  allVoided: boolean;
  voidedTeamIds: number[];
};

export function computeBetProgress(bet: Bet, runs: RunsMap): BetProgress {
  const perTeam = bet.teams.map((t) => ({
    teamId: t.id,
    score: runs.get(t.id) ?? null,
  }));

  let liveTotal = 0;
  let allFinalOrVoided = true;
  let voidedCount = 0;
  const voidedTeamIds: number[] = [];

  for (const entry of perTeam) {
    const s = entry.score;
    if (!s) {
      allFinalOrVoided = false;
      continue;
    }
    if (s.status === "voided") {
      voidedCount += 1;
      voidedTeamIds.push(entry.teamId);
      continue;
    }
    liveTotal += s.runs;
    if (s.status !== "final") allFinalOrVoided = false;
  }

  return {
    perTeam,
    liveTotal,
    allFinalOrVoided,
    anyVoided: voidedCount > 0,
    allVoided: voidedCount === bet.teams.length,
    voidedTeamIds,
  };
}

export type SettlementResult =
  | { kind: "refund"; reason: "all-voided"; payout: number }
  | { kind: "settled"; outcome: Outcome };

export function deriveSettlement(bet: Bet, runs: RunsMap): SettlementResult {
  const p = computeBetProgress(bet, runs);
  if (p.allVoided) {
    return { kind: "refund", reason: "all-voided", payout: bet.stake };
  }
  const outcome = settleBetOdds(
    bet.teams.length,
    p.liveTotal,
    bet.stake,
    lambdaFor(bet.sport),
  );
  return { kind: "settled", outcome };
}

export function buildMockRunsMap(bet: Bet, perTeamRuns: Record<number, number>): RunsMap {
  const map: RunsMap = new Map();
  for (const t of bet.teams) {
    map.set(t.id, {
      teamId: t.id,
      gamePk: Number(t.gameId),
      runs: perTeamRuns[t.id] ?? 0,
      status: "final",
      inning: 9,
      inningOrdinal: "9th",
      inningHalf: "Bottom",
    });
  }
  return map;
}


export function classifyNhlStatus(
  gameState?: string,
  scheduleState?: string,
): GameStatus {
  const sched = (scheduleState ?? "").toUpperCase();
  if (sched === "PPD" || sched === "CNCL" || sched === "SUSP") {
    return "voided";
  }
  const g = (gameState ?? "").toUpperCase();
  if (g === "OFF" || g === "FINAL") return "final";
  if (g === "LIVE" || g === "CRIT") return "live";
  return "scheduled";
}

function periodOrdinal(n: number | null): string | null {
  if (n === null) return null;
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  if (n === 4) return "OT";
  if (n === 5) return "SO";
  return `${n}th`;
}

export function extractGoalsMap(score: NhlScoreResponse): RunsMap {
  const map: RunsMap = new Map();
  const games = score.games ?? [];
  for (const g of games) {
    const status = classifyNhlStatus(g.gameState, g.gameScheduleState);
    const period = g.periodDescriptor?.number ?? null;
    const clock = g.clock?.timeRemaining ?? null;
    const isPlayed = status === "live" || status === "final";
    const awayGoals = isPlayed ? (g.awayTeam.score ?? 0) : 0;
    const homeGoals = isPlayed ? (g.homeTeam.score ?? 0) : 0;
    const common = {
      gamePk: g.id,
      status,
      inning: null,
      inningOrdinal: null,
      inningHalf: null,
      period,
      periodClock: clock,
    };
    map.set(g.awayTeam.id, {
      teamId: g.awayTeam.id,
      runs: awayGoals,
      ...common,
    });
    map.set(g.homeTeam.id, {
      teamId: g.homeTeam.id,
      runs: homeGoals,
      ...common,
    });
  }
  return map;
}

export { periodOrdinal as formatNhlPeriodOrdinal };
