import { describe, it, expect } from "vitest";
import {
  isPickLocked,
  msUntilPickLock,
  PICK_LOCK_LEAD_MS,
} from "./pick-lock";

const startsAtIso = "2026-04-18T23:05:00Z";
const startMs = Date.parse(startsAtIso);

describe("isPickLocked", () => {
  it("locks when scoreboard says live", () => {
    expect(
      isPickLocked({ startsAtIso, liveStatus: "live", now: startMs - 60_000 }),
    ).toBe(true);
  });

  it("locks when scoreboard says final", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "final",
        now: startMs - 60 * 60_000,
      }),
    ).toBe(true);
  });

  it("locks when scoreboard says voided", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "voided",
        now: startMs - 60 * 60_000,
      }),
    ).toBe(true);
  });

  it("does not lock when scheduled and well outside lead window", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "scheduled",
        now: startMs - 60 * 60_000,
      }),
    ).toBe(false);
  });

  it("locks when scheduled and inside lead window", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "scheduled",
        now: startMs - 5 * 60_000,
      }),
    ).toBe(true);
  });

  it("locks exactly at the lead threshold", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "scheduled",
        now: startMs - PICK_LOCK_LEAD_MS,
      }),
    ).toBe(true);
  });

  it("does not lock just outside the lead threshold", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: "scheduled",
        now: startMs - PICK_LOCK_LEAD_MS - 1_000,
      }),
    ).toBe(false);
  });

  it("falls back to the clock when scoreboard status is undefined", () => {
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: undefined,
        now: startMs - 60 * 60_000,
      }),
    ).toBe(false);
    expect(
      isPickLocked({
        startsAtIso,
        liveStatus: undefined,
        now: startMs - 5 * 60_000,
      }),
    ).toBe(true);
  });

  it("returns false for invalid startsAtIso", () => {
    expect(
      isPickLocked({
        startsAtIso: "not-a-date",
        liveStatus: undefined,
        now: 0,
      }),
    ).toBe(false);
  });
});

describe("msUntilPickLock", () => {
  it("returns remaining ms when scheduled and outside the lead window", () => {
    const now = startMs - 30 * 60_000;
    expect(msUntilPickLock({ startsAtIso, liveStatus: "scheduled", now })).toBe(
      30 * 60_000 - PICK_LOCK_LEAD_MS,
    );
  });

  it("returns null when inside the lead window", () => {
    expect(
      msUntilPickLock({
        startsAtIso,
        liveStatus: "scheduled",
        now: startMs - 5 * 60_000,
      }),
    ).toBeNull();
  });

  it("returns null when scoreboard says live/final/voided", () => {
    const now = startMs - 30 * 60_000;
    expect(
      msUntilPickLock({ startsAtIso, liveStatus: "live", now }),
    ).toBeNull();
    expect(
      msUntilPickLock({ startsAtIso, liveStatus: "final", now }),
    ).toBeNull();
    expect(
      msUntilPickLock({ startsAtIso, liveStatus: "voided", now }),
    ).toBeNull();
  });

  it("returns null for invalid startsAtIso", () => {
    expect(
      msUntilPickLock({
        startsAtIso: "not-a-date",
        liveStatus: undefined,
        now: 0,
      }),
    ).toBeNull();
  });
});
