import { describe, it, expect } from "vitest";
import { computeRefill } from "./refill";
import { MIN_STAKE, REFILL_AMOUNT, type UserState } from "./dev-users";

const baseState: UserState = {
  balance: 0,
  createdAt: "2026-04-18T00:00:00.000Z",
};

describe("computeRefill", () => {
  it("refills when balance is zero and no prior refill", () => {
    const next = computeRefill(baseState, "2026-04-19");
    expect(next).not.toBeNull();
    expect(next?.balance).toBe(REFILL_AMOUNT);
    expect(next?.lastRefillEtDate).toBe("2026-04-19");
  });

  it("refills when balance is below MIN_STAKE", () => {
    const next = computeRefill(
      { ...baseState, balance: MIN_STAKE - 1 },
      "2026-04-19",
    );
    expect(next?.balance).toBe(MIN_STAKE - 1 + REFILL_AMOUNT);
  });

  it("does not refill when balance >= MIN_STAKE", () => {
    expect(
      computeRefill({ ...baseState, balance: MIN_STAKE }, "2026-04-19"),
    ).toBeNull();
    expect(
      computeRefill({ ...baseState, balance: 42 }, "2026-04-19"),
    ).toBeNull();
  });

  it("does not refill twice in the same ET day (idempotent)", () => {
    const first = computeRefill(baseState, "2026-04-19");
    expect(first).not.toBeNull();
    const second = computeRefill(first as UserState, "2026-04-19");
    expect(second).toBeNull();
  });

  it("refills again the next ET day if balance drops below threshold", () => {
    const dayOne = computeRefill(baseState, "2026-04-19") as UserState;
    const spent: UserState = { ...dayOne, balance: 0 };
    const dayTwo = computeRefill(spent, "2026-04-20");
    expect(dayTwo?.balance).toBe(REFILL_AMOUNT);
    expect(dayTwo?.lastRefillEtDate).toBe("2026-04-20");
  });

  it("catch-up scope: missing 3 days still grants only a single +10", () => {
    const stateWithOldRefill: UserState = {
      ...baseState,
      balance: 0,
      lastRefillEtDate: "2026-04-16",
    };
    const next = computeRefill(stateWithOldRefill, "2026-04-19");
    expect(next?.balance).toBe(REFILL_AMOUNT);
    expect(next?.lastRefillEtDate).toBe("2026-04-19");
  });

  it("preserves createdAt and other fields", () => {
    const next = computeRefill(baseState, "2026-04-19");
    expect(next?.createdAt).toBe(baseState.createdAt);
  });
});
