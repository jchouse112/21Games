import { describe, expect, it } from "vitest";
import {
  calibratedOdds,
  committedRatio,
  compensatedHold,
  handProbabilities,
  HIT_COST_FRAC,
  LAMBDA_NBA,
  LAMBDA_MLB,
  LAMBDA_NHL,
  LAMBDA_SOCCER,
  lambdaFor,
  pickLimitsFor,
  payoutForTotal,
  previewTable,
  settleBet,
  SOCCER_TARGET,
  SOCCER_ZONE_LOW,
  TARGET,
  TARGET_HOLD,
  targetFor,
  ZONE_LOW,
  zoneLowFor,
} from "./odds";

describe("lambda constants", () => {
  it("exposes the canonical per-sport lambdas", () => {
    expect(LAMBDA_MLB).toBe(4.6);
    expect(LAMBDA_NHL).toBe(3.0);
    expect(LAMBDA_SOCCER).toBe(1.35);
    expect(LAMBDA_NBA).toBe(2.6);
  });

  it("lambdaFor returns the right value per sport", () => {
    expect(lambdaFor("mlb")).toBe(LAMBDA_MLB);
    expect(lambdaFor("nhl")).toBe(LAMBDA_NHL);
    expect(lambdaFor("soccer")).toBe(LAMBDA_SOCCER);
    expect(lambdaFor("nba")).toBe(LAMBDA_NBA);
  });
});

describe("sport-specific targets", () => {
  it("keeps MLB/NHL on 21 and moves soccer to Pitch 11", () => {
    expect(targetFor("mlb")).toBe(TARGET);
    expect(targetFor("nhl")).toBe(TARGET);
    expect(targetFor("nba")).toBe(TARGET);
    expect(targetFor("soccer")).toBe(SOCCER_TARGET);
    expect(zoneLowFor("soccer")).toBe(SOCCER_ZONE_LOW);
  });
});

describe("sport-specific pick limits", () => {
  it("keeps MLB at 3-6 teams", () => {
    expect(pickLimitsFor("mlb")).toEqual({ min: 3, max: 6 });
  });

  it("sets Ice 21 to 4-8 teams", () => {
    expect(pickLimitsFor("nhl")).toEqual({ min: 4, max: 8 });
  });

  it("sets Pitch 11 to 5-9 teams", () => {
    expect(pickLimitsFor("soccer")).toEqual({ min: 5, max: 9 });
  });

  it("sets Hoops 21 to 5-8 players", () => {
    expect(pickLimitsFor("nba")).toEqual({ min: 5, max: 8 });
  });
});

describe("backwards compatibility — MLB default", () => {
  it("payoutForTotal defaults to MLB lambda", () => {
    const a = payoutForTotal(4, 21, 10);
    const b = payoutForTotal(4, 21, 10, LAMBDA_MLB);
    expect(a).toBe(b);
  });

  it("calibratedOdds defaults to MLB lambda", () => {
    expect(calibratedOdds(4)).toBe(calibratedOdds(4, LAMBDA_MLB));
  });

  it("handProbabilities defaults to MLB lambda", () => {
    expect(handProbabilities(4)).toEqual(handProbabilities(4, LAMBDA_MLB));
  });

  it("settleBet defaults to MLB lambda", () => {
    const a = settleBet(4, 21, 10);
    const b = settleBet(4, 21, 10, LAMBDA_MLB);
    expect(a).toEqual(b);
  });

  it("previewTable defaults to MLB lambda", () => {
    expect(previewTable(4, 10)).toEqual(previewTable(4, 10, LAMBDA_MLB));
  });
});

describe("NHL lambda behavior", () => {
  it("produces a different payout curve than MLB for the same picks/stake", () => {
    const mlb = payoutForTotal(4, 21, 10, LAMBDA_MLB);
    const nhl = payoutForTotal(4, 21, 10, LAMBDA_NHL);
    expect(nhl).not.toBe(mlb);
  });

  it("pays more at TARGET with a lower lambda (rarer outcome)", () => {
    const mlb = payoutForTotal(4, TARGET, 10, LAMBDA_MLB);
    const nhl = payoutForTotal(4, TARGET, 10, LAMBDA_NHL);
    expect(nhl).toBeGreaterThan(mlb);
  });

  it("handProbabilities shifts pZone lower for NHL at typical pick counts", () => {
    const mlb = handProbabilities(4, LAMBDA_MLB);
    const nhl = handProbabilities(4, LAMBDA_NHL);
    expect(nhl.pZone).toBeLessThan(mlb.pZone);
    expect(nhl.pShort).toBeGreaterThan(mlb.pShort);
  });

  it("settleBet with NHL lambda still classifies short/bust correctly", () => {
    expect(settleBet(4, 10, 10, LAMBDA_NHL).status).toBe("short");
    expect(settleBet(4, 22, 10, LAMBDA_NHL).status).toBe("bust");
    expect(settleBet(4, 21, 10, LAMBDA_NHL).status).toBe("bj");
    expect(settleBet(4, 18, 10, LAMBDA_NHL).status).toBe("win");
  });
});

describe("Pitch 11 behavior", () => {
  it("renders an 8-11 payout table with 11 as blackjack", () => {
    const rows = previewTable(
      7,
      10,
      LAMBDA_SOCCER,
      10,
      SOCCER_TARGET,
      SOCCER_ZONE_LOW,
    );
    expect(rows.map((r) => r.total)).toEqual([8, 9, 10, 11]);
    expect(rows[rows.length - 1]?.isBj).toBe(true);
  });

  it("classifies soccer short/win/bj/bust around target 11", () => {
    expect(settleBet(7, 7, 10, LAMBDA_SOCCER, 10, 11, 8).status).toBe("short");
    expect(settleBet(7, 8, 10, LAMBDA_SOCCER, 10, 11, 8).status).toBe("win");
    expect(settleBet(7, 11, 10, LAMBDA_SOCCER, 10, 11, 8).status).toBe("bj");
    expect(settleBet(7, 12, 10, LAMBDA_SOCCER, 10, 11, 8).status).toBe("bust");
  });
});

describe("Hoops 21 behavior", () => {
  it("uses the standard 15-21 payout table with 21 as blackjack", () => {
    const rows = previewTable(6, 10, LAMBDA_NBA, 10, TARGET, ZONE_LOW);
    expect(rows.map((r) => r.total)).toEqual([15, 16, 17, 18, 19, 20, 21]);
    expect(rows[rows.length - 1]?.isBj).toBe(true);
  });

  it("classifies NBA short/win/bj/bust around target 21", () => {
    expect(settleBet(6, 14, 10, LAMBDA_NBA).status).toBe("short");
    expect(settleBet(6, 18, 10, LAMBDA_NBA).status).toBe("win");
    expect(settleBet(6, 21, 10, LAMBDA_NBA).status).toBe("bj");
    expect(settleBet(6, 22, 10, LAMBDA_NBA).status).toBe("bust");
  });
});

describe("committedRatio", () => {
  it("returns 1 when there are no hits", () => {
    expect(committedRatio(0)).toBe(1);
  });

  it("grows by HIT_COST_FRAC per hit", () => {
    expect(committedRatio(1)).toBeCloseTo(1 + HIT_COST_FRAC, 12);
    expect(committedRatio(2)).toBeCloseTo(1 + 2 * HIT_COST_FRAC, 12);
    expect(committedRatio(3)).toBeCloseTo(1 + 3 * HIT_COST_FRAC, 12);
  });

  it("clamps negative hit counts to zero", () => {
    expect(committedRatio(-1)).toBe(1);
    expect(committedRatio(-5)).toBe(1);
  });
});

describe("compensatedHold", () => {
  it("equals TARGET_HOLD at ratio 1 (no hits)", () => {
    expect(compensatedHold(1)).toBeCloseTo(TARGET_HOLD, 12);
  });

  it("rises monotonically as committed stake grows relative to base", () => {
    const h0 = compensatedHold(1);
    const h1 = compensatedHold(1.25);
    const h2 = compensatedHold(1.5);
    const h3 = compensatedHold(1.75);
    expect(h1).toBeGreaterThan(h0);
    expect(h2).toBeGreaterThan(h1);
    expect(h3).toBeGreaterThan(h2);
  });

  it("keeps expected payout-per-base constant across hit counts", () => {
    // Expected payout per committed dollar = (1 - hold); per base dollar =
    // ratio * (1 - hold). With compensated hold this must equal (1 - TARGET_HOLD).
    for (const hits of [0, 1, 2, 3, 4]) {
      const r = committedRatio(hits);
      const h = compensatedHold(r);
      expect(r * (1 - h)).toBeCloseTo(1 - TARGET_HOLD, 12);
    }
  });

  it("falls back to TARGET_HOLD for non-positive ratios", () => {
    expect(compensatedHold(0)).toBe(TARGET_HOLD);
    expect(compensatedHold(-1)).toBe(TARGET_HOLD);
  });
});

describe("payoutForTotal with committed stake (post-HIT reprice)", () => {
  it("matches base payout when no hits have occurred", () => {
    const base = payoutForTotal(4, 18, 10, LAMBDA_MLB);
    const same = payoutForTotal(4, 18, 10, LAMBDA_MLB, 10);
    expect(same).toBe(base);
  });

  it("keeps payout per base stake constant across hit counts (vig offsets stake growth)", () => {
    const n = 4;
    const base = 10;
    const total = 18;
    const lam = LAMBDA_MLB;
    const p0 = payoutForTotal(n, total, base, lam, base);
    for (const hits of [1, 2, 3]) {
      const committed = base * (1 + HIT_COST_FRAC * hits);
      const p = payoutForTotal(n, total, base, lam, committed);
      expect(p).toBeCloseTo(p0, 10);
    }
  });

  it("respects the 20x base / $2500 global cap regardless of committed stake", () => {
    const base = 200;
    const committed = base * (1 + HIT_COST_FRAC * 3); // 350
    const payout = payoutForTotal(3, TARGET, base, LAMBDA_MLB, committed);
    expect(payout).toBeLessThanOrEqual(Math.min(base * 20, 2500));
  });

  it("keeps the 15-run floor anchored to committed stake", () => {
    const base = 10;
    const committed = base * (1 + HIT_COST_FRAC * 2); // 15
    const payout = payoutForTotal(6, ZONE_LOW, base, LAMBDA_MLB, committed);
    // Floor guarantees 0.75 * committedStake at exactly 15.
    expect(payout).toBeGreaterThanOrEqual(committed * 0.75 - 1e-9);
  });
});
