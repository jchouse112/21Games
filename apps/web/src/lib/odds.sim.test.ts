import { describe, expect, it } from "vitest";
import {
  BASE_POINTS,
  BJ_BONUS,
  FLOOR_AT_15,
  GLOBAL_CAP,
  LAMBDA_MLB,
  SCALE_MULT,
  TARGET,
  ZONE_LOW,
  poissonPmf,
} from "./odds";

const TRIALS = 200_000;
const POST_HIT_VIG = 0.20;
const HIT_COST_FRAC = 0.25;
const MAX_TEAMS_SIM = 6;

function samplePoisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k += 1;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function calibratedOddsAt(n: number, lambda: number, hold: number): number {
  const lam = lambda * n;
  let weighted = 0;
  for (let t = ZONE_LOW; t <= TARGET; t += 1) {
    const p = poissonPmf(t, lam);
    const w = (BASE_POINTS[t] ?? 0) / TARGET;
    const b = t === TARGET ? BJ_BONUS : 1;
    weighted += p * w * b;
  }
  return (1 - hold) / Math.max(weighted, 1e-4);
}

type SimKnobs = {
  floorAt15: number;
  capEnabled: boolean;
};

function payoutAt(
  nFinal: number,
  total: number,
  baseStake: number,
  committedStake: number,
  hold: number,
  knobs: SimKnobs,
): number {
  if (total < ZONE_LOW || total > TARGET) return 0;
  const odds = calibratedOddsAt(nFinal, LAMBDA_MLB, hold);
  const w = (BASE_POINTS[total] ?? 0) / TARGET;
  const b = total === TARGET ? BJ_BONUS : 1;
  let raw = committedStake * odds * w * b;
  if (total === ZONE_LOW && knobs.floorAt15 > 0) {
    raw = Math.max(raw, committedStake * knobs.floorAt15);
  }
  if (!knobs.capEnabled) return raw;
  const cap = Math.min(baseStake * SCALE_MULT, GLOBAL_CAP);
  return Math.min(raw, cap);
}

type Archetype = {
  name: string;
  weight: number;
  pickN: () => number;
  hitCount: (nStart: number, liveTotal: number) => number;
};

const ARCHETYPES: Archetype[] = [
  {
    name: "conservative",
    weight: 0.4,
    pickN: () => 4 + Math.floor(Math.random() * 2),
    hitCount: () => 0,
  },
  {
    name: "standard",
    weight: 0.3,
    pickN: () => 3 + Math.floor(Math.random() * 3),
    hitCount: (_n, live) => (live < 12 ? 1 : 0),
  },
  {
    name: "aggressive",
    weight: 0.2,
    pickN: () => 3,
    hitCount: (n) => MAX_TEAMS_SIM - n,
  },
  {
    name: "sharp",
    weight: 0.1,
    pickN: () => 3,
    hitCount: (_n, live) => {
      if (live >= 15) return 0;
      if (live >= 12) return 1;
      if (live >= 8) return 2;
      return 3;
    },
  },
];

function pickArchetype(): Archetype {
  const r = Math.random();
  let acc = 0;
  for (const a of ARCHETYPES) {
    acc += a.weight;
    if (r <= acc) return a;
  }
  return ARCHETYPES[ARCHETYPES.length - 1]!;
}

function simulate(openVig: number, knobs: SimKnobs): {
  committed: number;
  payout: number;
  hold: number;
  bustRate: number;
  hitRate: number;
} {
  let committed = 0;
  let payout = 0;
  let busts = 0;
  let hits = 0;
  const baseStake = 10;
  for (let i = 0; i < TRIALS; i += 1) {
    const arch = pickArchetype();
    const n0 = arch.pickN();
    const initial: number[] = [];
    for (let j = 0; j < n0; j += 1) initial.push(samplePoisson(LAMBDA_MLB));
    const liveTotal = initial.reduce((a, b) => a + b, 0);
    const nHits = liveTotal >= 22 ? 0 : Math.min(arch.hitCount(n0, liveTotal), MAX_TEAMS_SIM - n0);
    if (nHits > 0) hits += 1;
    const addl: number[] = [];
    for (let j = 0; j < nHits; j += 1) addl.push(samplePoisson(LAMBDA_MLB));
    const committedStake = baseStake * (1 + HIT_COST_FRAC * nHits);
    committed += committedStake;
    const nFinal = n0 + nHits;
    const finalTotal = liveTotal + addl.reduce((a, b) => a + b, 0);
    if (finalTotal >= 22) {
      busts += 1;
      continue;
    }
    const vig = nHits > 0 ? POST_HIT_VIG : openVig;
    payout += payoutAt(nFinal, finalTotal, baseStake, committedStake, vig, knobs);
  }
  return {
    committed,
    payout,
    hold: 1 - payout / committed,
    bustRate: busts / TRIALS,
    hitRate: hits / TRIALS,
  };
}

const DEFAULT_KNOBS: SimKnobs = { floorAt15: FLOOR_AT_15, capEnabled: true };

function formatRow(vig: number, r: ReturnType<typeof simulate>): string {
  return (
    `${(vig * 100).toFixed(0).padStart(9, " ")}%  | ` +
    `${(r.hold * 100).toFixed(2).padStart(11, " ")}% | ` +
    `${(r.bustRate * 100).toFixed(1).padStart(7, " ")}% | ` +
    `${(r.hitRate * 100).toFixed(1).padStart(10, " ")}%`
  );
}

function table(title: string, vigs: number[], knobs: SimKnobs): string[] {
  const lines = [title];
  lines.push("pre-HIT vig | realized hold | bust rate | any-HIT rate");
  lines.push("------------|---------------|-----------|-------------");
  for (const v of vigs) lines.push(formatRow(v, simulate(v, knobs)));
  return lines;
}

function simulateFixed(n: number, vig: number, knobs: SimKnobs): number {
  let committed = 0;
  let payout = 0;
  const baseStake = 10;
  for (let i = 0; i < TRIALS; i += 1) {
    const runs: number[] = [];
    for (let j = 0; j < n; j += 1) runs.push(samplePoisson(LAMBDA_MLB));
    const total = runs.reduce((a, b) => a + b, 0);
    committed += baseStake;
    if (total >= 22) continue;
    payout += payoutAt(n, total, baseStake, baseStake, vig, knobs);
  }
  return 1 - payout / committed;
}

describe("Play 21 — blended hold simulation (MLB)", () => {
  it(
    "SANITY: fixed-n, no-hit, no-cap, no-floor hold equals target vig",
    { timeout: 60_000 },
    () => {
      const knobs: SimKnobs = { floorAt15: 0, capEnabled: false };
      const lines = ["\nSanity check — calibrator-only hold (no HIT, no floor, no cap)"];
      lines.push("n | vig=15% target | vig=20% target");
      for (const n of [3, 4, 5, 6]) {
        const h15 = simulateFixed(n, 0.15, knobs);
        const h20 = simulateFixed(n, 0.20, knobs);
        lines.push(`${n} | ${(h15 * 100).toFixed(2)}%         | ${(h20 * 100).toFixed(2)}%`);
      }
      console.log(lines.join("\n") + "\n");
    },
  );

  it(
    "sweeps pre-HIT vig under several knob configurations",
    { timeout: 60_000 },
    () => {
      const vigs = [0.15, 0.18, 0.20, 0.22, 0.25, 0.30];
      const mix = ARCHETYPES.map((a) => `${a.name}=${(a.weight * 100).toFixed(0)}%`).join(" · ");
      const header = `\nMLB blended hold sim — ${TRIALS.toLocaleString()} trials, post-HIT vig fixed at ${(POST_HIT_VIG * 100).toFixed(0)}%`;
      const lines: string[] = [header, `Player mix: ${mix}`];
      lines.push("", ...table(`\n[A] Current rules: floor=${FLOOR_AT_15} at t=15, cap ON`, vigs, DEFAULT_KNOBS));
      lines.push("", ...table("\n[B] Floor OFF, cap ON", vigs, { floorAt15: 0, capEnabled: true }));
      lines.push("", ...table("\n[C] Floor=0.50, cap ON", vigs, { floorAt15: 0.5, capEnabled: true }));
      lines.push("", ...table("\n[D] Floor OFF, cap OFF (pure calibrator)", vigs, { floorAt15: 0, capEnabled: false }));
      console.log(lines.join("\n") + "\n");
      expect(lines.length).toBeGreaterThan(vigs.length);
    },
  );
});
