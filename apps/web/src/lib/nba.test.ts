import { describe, expect, it } from "vitest";
import {
  extractNbaThreePointStatsMap,
  nbaEspnSeasonFromDate,
  parseNbaMadeThrees,
  type NbaStatsByAthleteResponse,
} from "./nba";

describe("nbaEspnSeasonFromDate", () => {
  it("uses the next year for fall NBA season starts", () => {
    expect(nbaEspnSeasonFromDate("2025-10-24")).toBe(2026);
  });

  it("keeps winter and spring dates in the current ESPN season year", () => {
    expect(nbaEspnSeasonFromDate("2026-04-25")).toBe(2026);
  });
});

describe("parseNbaMadeThrees", () => {
  it("parses made threes from ESPN 3PT strings", () => {
    expect(parseNbaMadeThrees(["MIN", "3PT", "PTS"], ["31", "5-9", "25"])).toBe(5);
  });
});

describe("extractNbaThreePointStatsMap", () => {
  it("extracts regular-season 3PT stats from ESPN leaderboard payloads", () => {
    const response: NbaStatsByAthleteResponse = {
      categories: [
        { name: "general", names: ["gamesPlayed", "avgMinutes"] },
        {
          name: "offensive",
          names: [
            "avgPoints",
            "avgThreePointFieldGoalsMade",
            "avgThreePointFieldGoalsAttempted",
            "threePointFieldGoalPct",
            "threePointFieldGoalsMade",
            "threePointFieldGoalsAttempted",
          ],
        },
      ],
      athletes: [
        {
          athlete: { id: "3975" },
          categories: [
            { name: "general", values: [43, 30.906977] },
            { name: "offensive", values: [26.6, 4.418605, 11.255814, 39.256, 190, 484] },
          ],
        },
      ],
    };

    const stats = extractNbaThreePointStatsMap(response).get(3975);

    expect(stats?.gamesPlayed).toBe(43);
    expect(stats?.avgThreePointersMade).toBeCloseTo(4.42, 2);
    expect(stats?.avgThreePointersAttempted).toBeCloseTo(11.26, 2);
    expect(stats?.threePointPct).toBeCloseTo(39.26, 2);
    expect(stats?.threePointersMade).toBe(190);
    expect(stats?.threePointersAttempted).toBe(484);
  });
});