import { describe, expect, it } from "vitest";
import type { TeamScore } from "./settlement";
import { isTeamHitEligible } from "./hit-window";

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

describe("isTeamHitEligible", () => {
  it("is never eligible for non-MLB sports", () => {
    expect(isTeamHitEligible("nhl", score(1, { status: "scheduled" }))).toBe(false);
    expect(isTeamHitEligible("nhl", undefined)).toBe(false);
  });

  it("treats a missing score as scheduled and eligible", () => {
    expect(isTeamHitEligible("mlb", undefined)).toBe(true);
  });

  it("is eligible while the game is still scheduled", () => {
    expect(isTeamHitEligible("mlb", score(1, { status: "scheduled" }))).toBe(true);
  });

  it("is eligible while live in innings 1-3", () => {
    for (const inning of [1, 2, 3]) {
      expect(
        isTeamHitEligible("mlb", score(1, { status: "live", inning })),
      ).toBe(true);
    }
  });

  it("is not eligible once the game reaches the top of the 4th", () => {
    expect(
      isTeamHitEligible("mlb", score(1, { status: "live", inning: 4, inningHalf: "Top" })),
    ).toBe(false);
  });

  it("is not eligible in late innings or final", () => {
    expect(
      isTeamHitEligible("mlb", score(1, { status: "live", inning: 7 })),
    ).toBe(false);
    expect(
      isTeamHitEligible("mlb", score(1, { status: "final", inning: 9 })),
    ).toBe(false);
  });

  it("is not eligible when the game is voided", () => {
    expect(isTeamHitEligible("mlb", score(1, { status: "voided" }))).toBe(false);
  });
});
