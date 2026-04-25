"use client";

import { useState } from "react";
import { useBets } from "@/lib/use-bets";
import type { Bet } from "@/lib/bets";
import type { Sport } from "@/lib/sport";


const STATUS_CHIP: Record<
  NonNullable<Bet["outcome"]>["status"],
  { label: string; className: string }
> = {
  bj: {
    label: "Blackjack",
    className: "border-emerald-400/50 bg-emerald-500/15 text-emerald-200",
  },
  win: {
    label: "Win",
    className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
  },
  short: {
    label: "Short",
    className: "border-zinc-600 bg-zinc-800 text-zinc-300",
  },
  bust: {
    label: "Bust",
    className: "border-rose-500/40 bg-rose-500/10 text-rose-200",
  },
};

export function ClosedBets() {
  const { settledBets } = useBets();
  const [expanded, setExpanded] = useState(false);

  if (settledBets.length === 0) return null;

  const visible = expanded ? settledBets : settledBets.slice(0, 3);

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Closed bets</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {settledBets.length} settled
        </span>
      </div>
      <ul className="mt-6 divide-y divide-zinc-800">
        {visible.map((bet) => (
          <ClosedRow key={bet.id} bet={bet} />
        ))}
      </ul>
      {settledBets.length > 3 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
        >
          {expanded ? "Show fewer" : `Show all ${settledBets.length}`}
        </button>
      )}
    </section>
  );
}

function SportBadge({ sport }: { sport: Sport }) {
  const cls =
    sport === "soccer"
      ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-200"
      : sport === "nhl"
      ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
      : "border-lime-400/40 bg-lime-400/10 text-lime-200";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] ${cls}`}
    >
      {sport}
    </span>
  );
}

function ClosedRow({ bet }: { bet: Bet }) {
  const outcome = bet.outcome;
  const chip = outcome ? STATUS_CHIP[outcome.status] : null;
  const settled = bet.settledAt
    ? new Date(bet.settledAt).toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";
  const net = outcome ? outcome.payout - bet.stake : -bet.stake;
  const netTint =
    net > 0 ? "text-emerald-300" : net < 0 ? "text-rose-300" : "text-zinc-300";

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SportBadge sport={bet.sport} />
          {chip && (
            <span
              className={`rounded-md border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${chip.className}`}
            >
              {chip.label}
            </span>
          )}
          <div className="flex flex-wrap gap-1">
            {bet.teams.map((t) => (
              <span
                key={t.id}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-0.5 font-mono text-xs text-zinc-300"
              >
                {t.abbr}
              </span>
            ))}
          </div>
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {bet.slateDate} · total {outcome?.total ?? 0} · settled {settled}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Stake
          </p>
          <p className="text-lg font-semibold text-zinc-100">{bet.stake}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Payout
          </p>
          <p className="text-lg font-semibold text-zinc-100">
            {(outcome?.payout ?? 0).toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Net
          </p>
          <p className={`text-lg font-semibold ${netTint}`}>
            {net >= 0 ? "+" : ""}
            {net.toFixed(2)}
          </p>
        </div>
      </div>
    </li>
  );
}
