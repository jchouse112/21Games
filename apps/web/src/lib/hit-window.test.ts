import { describe, expect, it } from "vitest";
import type { Bet } from "./bets";
import type { RunsMap, TeamScore } from "./settlement";
import {
  computeHitWindowCloseAtIso,
  isHitWindowClosed,
  MLB_HIT_WINDOW_FALLBACK_MS,
} from "./hit-window";

function makeBet(
  overrides: Partial<Bet> & Pick<Bet, "teams">,
): Bet {
  return {
    id: "bet-1",
    userId: "u1",
    sport: "mlb",
    slateDate: "2026-04-18",
    stake: 10,
    baseStake: 10,
    hits: [],
    status: "open",
    createdAt: "2026-04-18T17:00:00Z",
    ...overrides,
  };
}

function score(teamId: number, overrides: Partial<TeamScore> = {}): TeamScore {
  return {
    teamId,
    gamePk: teamId * 10,
    runs: 0,
    status: "scheduled",
    inning: null,
    inningOrdinal: null,
    inningHalf: null,
    ...overrides,
  };
}

describe("computeHitWindowCloseAtIso", () => {
  it("returns undefined for non-MLB sports", () => {
    expect(computeHitWindowCloseAtIso("nhl", ["2026-04-18T17:00:00Z"])).toBeUndefined();
  });

  it("returns undefined when no start times are known", () => {
    expect(computeHitWindowCloseAtIso("mlb", [])).toBeUndefined();
    expect(computeHitWindowCloseAtIso("mlb", [undefined, undefined])).toBeUndefined();
  });

  it("anchors to the earliest start plus the 55-minute fallback", () => {
    const early = "2026-04-18T17:05:00Z";
    const late = "2026-04-18T20:10:00Z";
    const result = computeHitWindowCloseAtIso("mlb", [late, early, undefined]);
    expect(result).toBeDefined();
    const expected = new Date(Date.parse(early) + MLB_HIT_WINDOW_FALLBACK_MS).toISOString();
    expect(result).toBe(expected);
  });

  it("ignores unparseable timestamps", () => {
    const early = "2026-04-18T17:05:00Z";
    const result = computeHitWindowCloseAtIso("mlb", ["not-a-date", early]);
    const expected = new Date(Date.parse(early) + MLB_HIT_WINDOW_FALLBACK_MS).toISOString();
    expect(result).toBe(expected);
  });
});

describe("isHitWindowClosed", () => {
  it("is always closed for non-MLB sports", () => {
    const bet = makeBet({ sport: "nhl", teams: [{ id: 1, abbr: "A", name: "A", gameId: "g1" }] });
    expect(isHitWindowClosed(bet, new Map())).toBe(true);
  });

  it("stays open before any game starts and before the fallback cutoff", () => {
    const startIso = "2026-04-18T17:00:00Z";
    const bet = makeBet({
      teams: [{ id: 1, abbr: "A", name: "A", gameId: "g1", startsAtIso: startIso }],
      hitWindowCloseAtIso: new Date(Date.parse(startIso) + MLB_HIT_WINDOW_FALLBACK_MS).toISOString(),
    });
    const runs: RunsMap = new Map([[1, score(1, { status: "scheduled" })]]);
    const now = Date.parse(startIso) - 60 * 1000; // 1 min before first pitch
    expect(isHitWindowClosed(bet, runs, now)).toBe(false);
  });

  it("closes when the earliest game is live and already past the top of the 4th", () => {
    const bet = makeBet({
      teams: [
        { id: 1, abbr: "A", name: "A", gameId: "g1" },
        { id: 2, abbr: "B", name: "B", gameId: "g2" },
      ],
    });
    const runs: RunsMap = new Map([
      [1, score(1, { status: "live", inning: 4, inningOrdinal: "4th", inningHalf: "Top" })],
      [2, score(2, { status: "scheduled" })],
    ]);
    expect(isHitWindowClosed(bet, runs)).toBe(true);
  });

  it("stays open while the earliest game is only in the 3rd inning", () => {
    const bet = makeBet({
      teams: [
        { id: 1, abbr: "A", name: "A", gameId: "g1" },
        { id: 2, abbr: "B", name: "B", gameId: "g2" },
      ],
    });
    const runs: RunsMap = new Map([
      [1, score(1, { status: "live", inning: 3, inningOrdinal: "3rd", inningHalf: "Bottom" })],
      [2, score(2, { status: "scheduled" })],
    ]);
    expect(isHitWindowClosed(bet, runs)).toBe(false);
  });

  it("closes when any team's game is final", () => {
    const bet = makeBet({
      teams: [{ id: 1, abbr: "A", name: "A", gameId: "g1" }],
    });
    const runs: RunsMap = new Map([
      [1, score(1, { status: "final", inning: 9, inningOrdinal: "9th", inningHalf: "Bottom" })],
    ]);
    expect(isHitWindowClosed(bet, runs)).toBe(true);
  });

  it("closes when any team's game is voided", () => {
    const bet = makeBet({
      teams: [{ id: 1, abbr: "A", name: "A", gameId: "g1" }],
    });
    const runs: RunsMap = new Map([[1, score(1, { status: "voided" })]]);
    expect(isHitWindowClosed(bet, runs)).toBe(true);
  });

  it("closes via the fallback deadline when no innings data is available", () => {
    const closeIso = "2026-04-18T18:00:00Z";
    const bet = makeBet({
      teams: [{ id: 1, abbr: "A", name: "A", gameId: "g1" }],
      hitWindowCloseAtIso: closeIso,
    });
    const runs: RunsMap = new Map([[1, score(1, { status: "scheduled" })]]);
    const now = Date.parse(closeIso) + 1;
    expect(isHitWindowClosed(bet, runs, now)).toBe(true);
  });
});
