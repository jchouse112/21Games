import { describe, expect, it } from "vitest";
import {
  buildMockRunsMap,
  classifyStatus,
  computeBetProgress,
  deriveInstantBust,
  deriveSettlement,
  extractRunsMap,
  type RunsMap,
} from "./settlement";
import type { Bet } from "./bets";
import type { ScheduleGame, ScheduleResponse } from "./mlb";
import { payoutForTotal, TARGET, ZONE_LOW } from "./odds";

function makeBet(teamIds: number[], stake = 10): Bet {
  return {
    id: "bet-1",
    userId: "u1",
    sport: "mlb",
    slateDate: "2026-04-18",
    teams: teamIds.map((id, i) => ({
      id,
      abbr: `T${id}`,
      name: `Team ${id}`,
      gameId: `g-${Math.floor(i / 2) + 1}`,
    })),
    stake,
    baseStake: stake,
    hits: [],
    status: "open",
    createdAt: "2026-04-18T17:00:00Z",
  };
}

function makeGame(overrides: Partial<ScheduleGame> & {
  gamePk: number;
  awayId: number;
  homeId: number;
  awayRuns?: number;
  homeRuns?: number;
  detailedState: string;
}): ScheduleGame {
  const {
    gamePk,
    awayId,
    homeId,
    awayRuns,
    homeRuns,
    detailedState,
    ...rest
  } = overrides;
  return {
    gamePk,
    gameDate: "2026-04-18T17:00:00Z",
    status: { detailedState },
    teams: {
      away: { team: { id: awayId, name: `A${awayId}` } },
      home: { team: { id: homeId, name: `H${homeId}` } },
    },
    linescore:
      awayRuns !== undefined || homeRuns !== undefined
        ? {
            currentInning: 5,
            currentInningOrdinal: "5th",
            inningHalf: "Top",
            teams: {
              away: { runs: awayRuns },
              home: { runs: homeRuns },
            },
          }
        : undefined,
    ...rest,
  };
}

describe("classifyStatus", () => {
  it("returns scheduled for empty/missing state", () => {
    expect(classifyStatus()).toBe("scheduled");
    expect(classifyStatus("")).toBe("scheduled");
    expect(classifyStatus("Scheduled")).toBe("scheduled");
    expect(classifyStatus("Pre-Game")).toBe("scheduled");
    expect(classifyStatus("Warmup")).toBe("scheduled");
  });

  it("returns final for Final / Game Over / Completed Early", () => {
    expect(classifyStatus("Final")).toBe("final");
    expect(classifyStatus("Game Over")).toBe("final");
    expect(classifyStatus("Completed Early: Rain")).toBe("final");
  });

  it("returns voided for postponed and cancelled variants", () => {
    expect(classifyStatus("Postponed")).toBe("voided");
    expect(classifyStatus("Cancelled")).toBe("voided");
    expect(classifyStatus("Canceled")).toBe("voided");
  });

  it("returns live for in-progress states", () => {
    expect(classifyStatus("In Progress")).toBe("live");
    expect(classifyStatus("Manager Challenge")).toBe("live");
    expect(classifyStatus("Delayed: Rain")).toBe("live");
  });
});

describe("extractRunsMap", () => {
  const schedule: ScheduleResponse = {
    dates: [
      {
        date: "2026-04-18",
        games: [
          makeGame({
            gamePk: 1,
            awayId: 100,
            homeId: 101,
            awayRuns: 3,
            homeRuns: 5,
            detailedState: "Final",
          }),
          makeGame({
            gamePk: 2,
            awayId: 200,
            homeId: 201,
            awayRuns: 2,
            homeRuns: 1,
            detailedState: "In Progress",
          }),
          makeGame({
            gamePk: 3,
            awayId: 300,
            homeId: 301,
            detailedState: "Scheduled",
          }),
          makeGame({
            gamePk: 4,
            awayId: 400,
            homeId: 401,
            detailedState: "Postponed",
          }),
          // Doubleheader game 2 — should be skipped.
          makeGame({
            gamePk: 5,
            awayId: 100,
            homeId: 101,
            awayRuns: 99,
            homeRuns: 99,
            detailedState: "Final",
            gameNumber: 2,
          }),
        ],
      },
    ],
  };

  const map = extractRunsMap(schedule);

  it("carries live runs and marks status live", () => {
    const away = map.get(200);
    const home = map.get(201);
    expect(away?.runs).toBe(2);
    expect(home?.runs).toBe(1);
    expect(away?.status).toBe("live");
    expect(away?.inning).toBe(5);
    expect(away?.inningOrdinal).toBe("5th");
  });

  it("carries final runs and marks status final", () => {
    expect(map.get(100)?.runs).toBe(3);
    expect(map.get(101)?.runs).toBe(5);
    expect(map.get(100)?.status).toBe("final");
  });

  it("zeros runs for scheduled games", () => {
    expect(map.get(300)?.runs).toBe(0);
    expect(map.get(300)?.status).toBe("scheduled");
  });

  it("marks postponed games voided with zero runs", () => {
    expect(map.get(400)?.runs).toBe(0);
    expect(map.get(400)?.status).toBe("voided");
    expect(map.get(401)?.status).toBe("voided");
  });

  it("skips doubleheader game 2", () => {
    // Game 5 is doubleheader #2 for teams 100/101 — entries should reflect
    // game 1 only (runs 3 and 5, not 99).
    expect(map.get(100)?.gamePk).toBe(1);
    expect(map.get(101)?.gamePk).toBe(1);
  });

  it("returns empty map for missing dates", () => {
    expect(extractRunsMap({}).size).toBe(0);
    expect(extractRunsMap({ dates: [] }).size).toBe(0);
  });
});

describe("computeBetProgress", () => {
  it("sums runs across final + live, flags not-yet-final", () => {
    const bet = makeBet([1, 2, 3]);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 5, status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" }],
      [2, { teamId: 2, gamePk: 11, runs: 3, status: "live", inning: 6, inningOrdinal: "6th", inningHalf: "Top" }],
      [3, { teamId: 3, gamePk: 12, runs: 0, status: "scheduled", inning: null, inningOrdinal: null, inningHalf: null }],
    ]);
    const p = computeBetProgress(bet, runs);
    expect(p.liveTotal).toBe(8);
    expect(p.allFinalOrVoided).toBe(false);
    expect(p.anyVoided).toBe(false);
    expect(p.allVoided).toBe(false);
  });

  it("excludes voided teams from live total and tracks them", () => {
    const bet = makeBet([1, 2]);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 7, status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" }],
      [2, { teamId: 2, gamePk: 11, runs: 0, status: "voided", inning: null, inningOrdinal: null, inningHalf: null }],
    ]);
    const p = computeBetProgress(bet, runs);
    expect(p.liveTotal).toBe(7);
    expect(p.anyVoided).toBe(true);
    expect(p.allVoided).toBe(false);
    expect(p.voidedTeamIds).toEqual([2]);
    expect(p.allFinalOrVoided).toBe(true);
  });

  it("flags allVoided when every team is voided", () => {
    const bet = makeBet([1, 2, 3]);
    const runs: RunsMap = new Map(
      bet.teams.map((t) => [
        t.id,
        { teamId: t.id, gamePk: 0, runs: 0, status: "voided" as const, inning: null, inningOrdinal: null, inningHalf: null },
      ]),
    );
    const p = computeBetProgress(bet, runs);
    expect(p.allVoided).toBe(true);
    expect(p.anyVoided).toBe(true);
    expect(p.liveTotal).toBe(0);
  });

  it("treats missing team entries as not-final and skips them", () => {
    const bet = makeBet([1, 2]);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 4, status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" }],
    ]);
    const p = computeBetProgress(bet, runs);
    expect(p.liveTotal).toBe(4);
    expect(p.allFinalOrVoided).toBe(false);
    expect(p.perTeam[1].score).toBeNull();
  });
});

describe("deriveSettlement", () => {
  it("refunds the full stake when all teams are voided", () => {
    const bet = makeBet([1, 2, 3], 50);
    const runs = new Map(
      bet.teams.map((t) => [
        t.id,
        { teamId: t.id, gamePk: 0, runs: 0, status: "voided" as const, inning: null, inningOrdinal: null, inningHalf: null },
      ]),
    );
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("refund");
    if (result.kind === "refund") {
      expect(result.reason).toBe("all-voided");
      expect(result.payout).toBe(50);
    }
  });

  it("settles a bust when total > 21", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs = buildMockRunsMap(bet, { 1: 10, 2: 8, 3: 5 });
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      expect(result.outcome.status).toBe("bust");
      expect(result.outcome.total).toBe(23);
      expect(result.outcome.payout).toBe(0);
    }
  });

  it("settles short when total < 15", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs = buildMockRunsMap(bet, { 1: 4, 2: 5, 3: 5 });
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      expect(result.outcome.status).toBe("short");
      expect(result.outcome.total).toBe(14);
      expect(result.outcome.payout).toBe(0);
    }
  });

  it("settles a bj (exact 21) with bonus-weighted payout", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs = buildMockRunsMap(bet, { 1: 7, 2: 7, 3: 7 });
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      expect(result.outcome.status).toBe("bj");
      expect(result.outcome.total).toBe(TARGET);
      expect(result.outcome.basePoints).toBe(21);
      expect(result.outcome.payout).toBeGreaterThan(bet.stake);
      // BJ payout must match the canonical payoutForTotal for this bet.
      expect(result.outcome.payout).toBe(payoutForTotal(bet.teams.length, TARGET, bet.stake));
    }
  });

  it("settles a win in the 15-20 zone", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs = buildMockRunsMap(bet, { 1: 6, 2: 6, 3: 6 });
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      expect(result.outcome.status).toBe("win");
      expect(result.outcome.total).toBe(18);
      expect(result.outcome.payout).toBeGreaterThan(0);
    }
  });

  it("honors the 15-zone floor payout", () => {
    const bet = makeBet([1, 2, 3], 100);
    const runs = buildMockRunsMap(bet, { 1: 5, 2: 5, 3: 5 });
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      expect(result.outcome.status).toBe("win");
      expect(result.outcome.total).toBe(ZONE_LOW);
      // Floor at 15 guarantees at least 0.75 * stake.
      expect(result.outcome.payout).toBeGreaterThanOrEqual(75);
    }
  });

  it("treats voided teams as 0 runs when some teams still play", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 7, status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" }],
      [2, { teamId: 2, gamePk: 11, runs: 7, status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" }],
      [3, { teamId: 3, gamePk: 12, runs: 0, status: "voided", inning: null, inningOrdinal: null, inningHalf: null }],
    ]);
    const result = deriveSettlement(bet, runs);
    expect(result.kind).toBe("settled");
    if (result.kind === "settled") {
      // 7 + 7 + voided(0) = 14 -> short
      expect(result.outcome.total).toBe(14);
      expect(result.outcome.status).toBe("short");
    }
  });
});

describe("deriveInstantBust", () => {
  it("returns null when live total is below 22", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 10, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
      [2, { teamId: 2, gamePk: 11, runs: 8, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
      [3, { teamId: 3, gamePk: 12, runs: 3, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
    ]);
    expect(deriveInstantBust(bet, runs)).toBeNull();
  });

  it("returns a bust outcome when live total reaches 22", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 10, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
      [2, { teamId: 2, gamePk: 11, runs: 9, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
      [3, { teamId: 3, gamePk: 12, runs: 3, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
    ]);
    const result = deriveInstantBust(bet, runs);
    expect(result).not.toBeNull();
    expect(result?.status).toBe("bust");
    expect(result?.total).toBe(22);
    expect(result?.payout).toBe(0);
  });

  it("fires even when some teams are still scheduled", () => {
    const bet = makeBet([1, 2, 3], 10);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 15, status: "live", inning: 3, inningOrdinal: "3rd", inningHalf: "Top" }],
      [2, { teamId: 2, gamePk: 11, runs: 7, status: "live", inning: 3, inningOrdinal: "3rd", inningHalf: "Top" }],
    ]);
    const result = deriveInstantBust(bet, runs);
    expect(result?.status).toBe("bust");
    expect(result?.total).toBe(22);
  });

  it("ignores voided teams when summing the live total", () => {
    const bet = makeBet([1, 2], 10);
    const runs: RunsMap = new Map([
      [1, { teamId: 1, gamePk: 10, runs: 22, status: "voided", inning: null, inningOrdinal: null, inningHalf: null }],
      [2, { teamId: 2, gamePk: 11, runs: 5, status: "live", inning: 5, inningOrdinal: "5th", inningHalf: "Top" }],
    ]);
    expect(deriveInstantBust(bet, runs)).toBeNull();
  });
});

describe("buildMockRunsMap", () => {
  it("maps every bet team to a final entry with given runs", () => {
    const bet = makeBet([10, 20, 30]);
    const map = buildMockRunsMap(bet, { 10: 7, 20: 8 });
    expect(map.size).toBe(3);
    expect(map.get(10)?.runs).toBe(7);
    expect(map.get(20)?.runs).toBe(8);
    expect(map.get(30)?.runs).toBe(0);
    for (const t of bet.teams) {
      expect(map.get(t.id)?.status).toBe("final");
    }
  });
});

