"use client";

import { useState } from "react";

type SportKey = "mlb" | "nhl" | "nba" | "nfl" | "soccer";

type Step = { num: string; title: string; body: string };

type SportHowTo = {
  key: SportKey;
  label: string;
  status: "Live" | "Coming soon";
  eyebrow: string;
  summary: string;
  steps: Step[];
};

const HOW_TO: SportHowTo[] = [
  {
    key: "mlb",
    label: "Baseball 21",
    status: "Live",
    eyebrow: "Teams · Runs",
    summary: "Pick MLB teams and chase 21 total runs without busting.",
    steps: [
      { num: "01", title: "Pick your teams", body: "Choose 3-6 teams from today's or tomorrow's slate. No spreads. No props. Just teams." },
      { num: "02", title: "Chase 21", body: "Their combined runs need to hit 21 — exact, or just under. Go over, you bust." },
      { num: "03", title: "Hit for more", body: "Add a team early in its game — before the 4th inning. 25% of your stake, up to 6 total." },
      { num: "04", title: "Win the slate", body: "Closer to 21 = bigger payout. Hit exactly 21 for the Blackjack bonus." },
    ],
  },
  {
    key: "nhl",
    label: "Ice 21",
    status: "Live",
    eyebrow: "Teams · Goals",
    summary: "Pick NHL teams and chase 21 total goals across your ticket.",
    steps: [
      { num: "01", title: "Pick your teams", body: "Choose 3-6 teams from today's or tomorrow's hockey slate." },
      { num: "02", title: "Chase 21", body: "Their combined goals count toward 21. Stay under or land it exactly." },
      { num: "03", title: "Hit for more", body: "Add a team early — before the 2nd period begins. 25% of your stake, up to 6 total." },
      { num: "04", title: "Win the slate", body: "The closer you finish to 21, the bigger the token payout." },
    ],
  },
  {
    key: "nba",
    label: "Hoops 21",
    status: "Coming soon",
    eyebrow: "Players · 3-pointers",
    summary: "Pick players and chase 21 made threes across the slate.",
    steps: [
      { num: "01", title: "Pick your players", body: "Choose 3-6 players from the NBA slate — shooters, stars, or long-shot heat checks." },
      { num: "02", title: "Chase 21", body: "Their combined made 3-pointers need to reach 21 without going over." },
      { num: "03", title: "Hit for more", body: "Add another player while that player's game is still early. Same 25% Hit cost, up to 6 total." },
      { num: "04", title: "Win the slate", body: "More made threes gets you closer to 21. Exactly 21 earns the Blackjack bonus." },
    ],
  },
  {
    key: "nfl",
    label: "Gridiron 21",
    status: "Coming soon",
    eyebrow: "Teams · Touchdowns",
    summary: "Pick football teams and chase 21 total touchdowns.",
    steps: [
      { num: "01", title: "Pick your teams", body: "Build a 3-6 team ticket from the football slate." },
      { num: "02", title: "Chase 21", body: "Touchdowns are the count. Land close to 21 without going over." },
      { num: "03", title: "Hit for more", body: "Add a team early in its game. Final football Hit window is coming soon." },
      { num: "04", title: "Win the slate", body: "Closest to 21 wins bigger. Exact 21 gets the Blackjack bonus." },
    ],
  },
  {
    key: "soccer",
    label: "Pitch 9",
    status: "Coming soon",
    eyebrow: "Teams · Goals",
    summary: "A lower-scoring soccer variant built around a 9-goal target.",
    steps: [
      { num: "01", title: "Pick your teams", body: "Choose teams from the soccer slate once Pitch goes live." },
      { num: "02", title: "Chase 9", body: "Soccer is lower scoring, so Pitch uses a 9-goal target instead of 21." },
      { num: "03", title: "Hit for more", body: "Add another team before its match moves too far along. Final rules coming soon." },
      { num: "04", title: "Win the slate", body: "Finish closest to the target without going over." },
    ],
  },
];

export function HowItWorks() {
  const [activeKey, setActiveKey] = useState<SportKey>("mlb");
  const active = HOW_TO.find((item) => item.key === activeKey) ?? HOW_TO[0]!;

  return (
    <section id="how-it-works" className="border-t border-zinc-800 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-4xl font-semibold tracking-tight sm:text-5xl">How it works</h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
          Each sport keeps the blackjack target, but the stat changes — runs, goals, threes, touchdowns, and more.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-2" role="tablist" aria-label="Choose sport rules">
          {HOW_TO.map((item) => {
            const selected = item.key === active.key;
            return (
              <button
                key={item.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setActiveKey(item.key)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  selected
                    ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">{active.eyebrow}</p>
              <h3 className="mt-2 text-2xl font-semibold">{active.label}</h3>
              <p className="mt-2 text-zinc-400">{active.summary}</p>
            </div>
            <span className="rounded-full border border-zinc-700 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400">
              {active.status}
            </span>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {active.steps.map((step) => (
              <div key={step.num} className="flex flex-col gap-3">
                <span className="font-mono text-sm text-emerald-400">{step.num}</span>
                <h4 className="text-2xl font-semibold">{step.title}</h4>
                <p className="text-zinc-400">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
