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

describe("isTeamHitEligible — MLB", () => {
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

describe("isTeamHitEligible — NHL", () => {
  it("treats a missing score as scheduled and eligible", () => {
    expect(isTeamHitEligible("nhl", undefined)).toBe(true);
  });

  it("is eligible while the game is still scheduled", () => {
    expect(isTeamHitEligible("nhl", score(1, { status: "scheduled" }))).toBe(true);
  });

  it("is eligible while live in the 1st period", () => {
    expect(
      isTeamHitEligible("nhl", score(1, { status: "live", period: 1 })),
    ).toBe(true);
  });

  it("is not eligible once the 2nd period begins", () => {
    expect(
      isTeamHitEligible("nhl", score(1, { status: "live", period: 2 })),
    ).toBe(false);
  });

  it("is not eligible in later periods, OT, or final", () => {
    expect(
      isTeamHitEligible("nhl", score(1, { status: "live", period: 3 })),
    ).toBe(false);
    expect(
      isTeamHitEligible("nhl", score(1, { status: "live", period: 4 })),
    ).toBe(false);
    expect(
      isTeamHitEligible("nhl", score(1, { status: "final", period: 3 })),
    ).toBe(false);
  });

  it("is not eligible when the game is voided", () => {
    expect(isTeamHitEligible("nhl", score(1, { status: "voided" }))).toBe(false);
  });
});

describe("isTeamHitEligible — Soccer", () => {
  it("treats a missing score as scheduled and eligible", () => {
    expect(isTeamHitEligible("soccer", undefined)).toBe(true);
  });

  it("is eligible before and during the 1st half", () => {
    expect(isTeamHitEligible("soccer", score(1, { status: "scheduled" }))).toBe(true);
    expect(
      isTeamHitEligible("soccer", score(1, { status: "live", period: 1 })),
    ).toBe(true);
  });

  it("is not eligible once the 2nd half begins", () => {
    expect(
      isTeamHitEligible("soccer", score(1, { status: "live", period: 2 })),
    ).toBe(false);
  });
});

describe("isTeamHitEligible — NBA", () => {
  it("treats a missing score as scheduled and eligible", () => {
    expect(isTeamHitEligible("nba", undefined)).toBe(true);
  });

  it("is eligible before and during the 1st quarter", () => {
    expect(isTeamHitEligible("nba", score(1, { status: "scheduled" }))).toBe(true);
    expect(
      isTeamHitEligible("nba", score(1, { status: "live", period: 1 })),
    ).toBe(true);
  });

  it("is not eligible once the 2nd quarter begins", () => {
    expect(
      isTeamHitEligible("nba", score(1, { status: "live", period: 2 })),
    ).toBe(false);
  });
});
