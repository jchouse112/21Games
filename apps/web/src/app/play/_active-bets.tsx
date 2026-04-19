"use client";

import { useBets } from "@/lib/use-bets";
import { useDevUser } from "@/lib/use-dev-user";
import { handProbabilities } from "@/lib/odds";
import type { Bet } from "@/lib/bets";

export function ActiveBets() {
  const { openBets, removeBet } = useBets();
  const { state, updateBalance } = useDevUser();

  if (openBets.length === 0) return null;

  function cancel(bet: Bet) {
    updateBalance(state.balance + bet.stake);
    removeBet(bet.id);
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Open bets</h2>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {openBets.length} active
        </span>
      </div>
      <ul className="mt-6 divide-y divide-zinc-800">
        {openBets.map((bet) => (
          <BetRow key={bet.id} bet={bet} onCancel={() => cancel(bet)} />
        ))}
      </ul>
    </section>
  );
}

function BetRow({ bet, onCancel }: { bet: Bet; onCancel: () => void }) {
  const probs = handProbabilities(bet.teams.length);
  const placed = new Date(bet.createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <li className="flex flex-wrap items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <div className="flex flex-wrap gap-1">
          {bet.teams.map((t) => (
            <span
              key={t.id}
              className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-xs text-emerald-200"
            >
              {t.abbr}
            </span>
          ))}
        </div>
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          {bet.teams.length} teams &middot; placed {placed} &middot; win{" "}
          {(probs.pZone * 100).toFixed(0)}% &middot; bj{" "}
          {(probs.pBj * 100).toFixed(1)}%
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Stake
          </p>
          <p className="text-lg font-semibold text-zinc-100">{bet.stake}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-red-400 hover:text-red-300"
        >
          Cancel
        </button>
      </div>
    </li>
  );
}
