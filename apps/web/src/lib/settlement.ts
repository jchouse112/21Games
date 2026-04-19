import type { ScheduleResponse } from "./mlb";
import type { Bet } from "./bets";
import { settleBet as settleBetOdds, type Outcome } from "./odds";

export type GameStatus = "scheduled" | "live" | "final" | "voided";

export type TeamScore = {
  teamId: number;
  gamePk: number;
  runs: number;
  status: GameStatus;
  inning: number | null;
  inningOrdinal: string | null;
  inningHalf: string | null;
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
  const outcome = settleBetOdds(bet.teams.length, p.liveTotal, bet.stake);
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
