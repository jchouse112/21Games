import { describe, expect, it } from "vitest";
import { classifyNhlStatus, extractGoalsMap } from "./settlement";
import type { NhlScoreResponse, NhlScheduleGame } from "./nhl";

function makeGame(partial: Partial<NhlScheduleGame>): NhlScheduleGame {
  return {
    id: 2024020001,
    startTimeUTC: "2026-04-18T23:00:00Z",
    gameState: "FUT",
    awayTeam: { id: 10, abbrev: "TOR" },
    homeTeam: { id: 21, abbrev: "MTL" },
    ...partial,
  };
}

describe("classifyNhlStatus", () => {
  it("returns scheduled for FUT and PRE", () => {
    expect(classifyNhlStatus("FUT")).toBe("scheduled");
    expect(classifyNhlStatus("PRE")).toBe("scheduled");
  });

  it("returns live for LIVE and CRIT", () => {
    expect(classifyNhlStatus("LIVE")).toBe("live");
    expect(classifyNhlStatus("CRIT")).toBe("live");
  });

  it("returns final for OFF and FINAL", () => {
    expect(classifyNhlStatus("OFF")).toBe("final");
    expect(classifyNhlStatus("FINAL")).toBe("final");
  });

  it("returns voided for postponed/cancelled/suspended schedule states", () => {
    expect(classifyNhlStatus("FUT", "PPD")).toBe("voided");
    expect(classifyNhlStatus("LIVE", "CNCL")).toBe("voided");
    expect(classifyNhlStatus("FUT", "SUSP")).toBe("voided");
  });

  it("is case insensitive", () => {
    expect(classifyNhlStatus("live")).toBe("live");
    expect(classifyNhlStatus("off")).toBe("final");
  });
});

describe("extractGoalsMap", () => {
  it("returns an empty map for a response with no games", () => {
    const score: NhlScoreResponse = { games: [] };
    expect(extractGoalsMap(score).size).toBe(0);
  });

  it("carries live goals and marks status live with period metadata", () => {
    const score: NhlScoreResponse = {
      games: [
        makeGame({
          gameState: "LIVE",
          periodDescriptor: { number: 2 },
          clock: { timeRemaining: "12:34" },
          awayTeam: { id: 10, abbrev: "TOR", score: 1 },
          homeTeam: { id: 21, abbrev: "MTL", score: 2 },
        }),
      ],
    };
    const map = extractGoalsMap(score);
    expect(map.get(10)?.runs).toBe(1);
    expect(map.get(21)?.runs).toBe(2);
    expect(map.get(10)?.status).toBe("live");
    expect(map.get(10)?.period).toBe(2);
    expect(map.get(10)?.periodClock).toBe("12:34");
  });

  it("zeros goals for scheduled games", () => {
    const score: NhlScoreResponse = {
      games: [
        makeGame({
          gameState: "FUT",
          awayTeam: { id: 10, abbrev: "TOR", score: 4 },
          homeTeam: { id: 21, abbrev: "MTL", score: 5 },
        }),
      ],
    };
    const map = extractGoalsMap(score);
    expect(map.get(10)?.runs).toBe(0);
    expect(map.get(21)?.runs).toBe(0);
    expect(map.get(10)?.status).toBe("scheduled");
  });

  it("marks postponed games voided with zero goals", () => {
    const score: NhlScoreResponse = {
      games: [
        makeGame({
          gameState: "FUT",
          gameScheduleState: "PPD",
          awayTeam: { id: 10, abbrev: "TOR", score: 3 },
          homeTeam: { id: 21, abbrev: "MTL", score: 2 },
        }),
      ],
    };
    const map = extractGoalsMap(score);
    expect(map.get(10)?.status).toBe("voided");
    expect(map.get(10)?.runs).toBe(0);
  });

  it("carries final goals and marks status final", () => {
    const score: NhlScoreResponse = {
      games: [
        makeGame({
          gameState: "OFF",
          periodDescriptor: { number: 3 },
          awayTeam: { id: 10, abbrev: "TOR", score: 3 },
          homeTeam: { id: 21, abbrev: "MTL", score: 2 },
        }),
      ],
    };
    const map = extractGoalsMap(score);
    expect(map.get(10)?.runs).toBe(3);
    expect(map.get(21)?.runs).toBe(2);
    expect(map.get(10)?.status).toBe("final");
  });
});
