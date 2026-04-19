"use client";

import Link from "next/link";
import { useBets } from "@/lib/use-bets";

export function OpenBetsPill() {
  const { openBets } = useBets();
  if (openBets.length === 0) return null;

  const stakeSum = openBets.reduce((acc, b) => acc + b.stake, 0);
  const label =
    openBets.length === 1 ? "1 open bet" : `${openBets.length} open bets`;

  return (
    <Link
      href="/play/my-bets"
      className="mt-8 flex items-center justify-between gap-4 rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-3 transition hover:border-emerald-400/60 hover:bg-emerald-400/10"
    >
      <div className="flex items-center gap-3">
        <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
        <span className="text-sm font-medium text-emerald-100">{label}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300/70">
          {stakeSum} token{stakeSum === 1 ? "" : "s"} staked
        </span>
      </div>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-300">
        View my bets &rarr;
      </span>
    </Link>
  );
}
