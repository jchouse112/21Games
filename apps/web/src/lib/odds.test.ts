import { describe, expect, it } from "vitest";
import {
  calibratedOdds,
  handProbabilities,
  LAMBDA_MLB,
  LAMBDA_NHL,
  lambdaFor,
  payoutForTotal,
  previewTable,
  settleBet,
  TARGET,
} from "./odds";

describe("lambda constants", () => {
  it("exposes the canonical per-sport lambdas", () => {
    expect(LAMBDA_MLB).toBe(4.6);
    expect(LAMBDA_NHL).toBe(3.0);
  });

  it("lambdaFor returns the right value per sport", () => {
    expect(lambdaFor("mlb")).toBe(LAMBDA_MLB);
    expect(lambdaFor("nhl")).toBe(LAMBDA_NHL);
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
