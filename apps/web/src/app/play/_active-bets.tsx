"use client";

import { useMemo, useState } from "react";
import { useBets } from "@/lib/use-bets";
import { useDevUser } from "@/lib/use-dev-user";
import { useLiveScores } from "@/lib/use-live-scores";
import {
  handProbabilities,
  lambdaFor,
  payoutForTotal,
  ZONE_LOW,
  TARGET,
} from "@/lib/odds";
import {
  buildMockRunsMap,
  computeBetProgress,
  deriveSettlement,
  type RunsMap,
  type TeamScore,
} from "@/lib/settlement";
import type { Bet } from "@/lib/bets";
import { scoreKey, type Sport } from "@/lib/sport";

export function ActiveBets() {
  const { openBets, removeBet, updateBet } = useBets();
  const { state, updateBalance } = useDevUser();

  const targets = useMemo(
    () => openBets.map((b) => ({ sport: b.sport, date: b.slateDate })),
    [openBets],
  );
  const { runsBySportDate, lastUpdated, refresh } = useLiveScores(targets);

  if (openBets.length === 0) return null;

  function cancel(bet: Bet) {
    updateBalance(state.balance + bet.stake);
    removeBet(bet.id);
  }

  function settle(bet: Bet, runs: RunsMap) {
    const result = deriveSettlement(bet, runs);
    if (result.kind === "refund") {
      updateBalance(state.balance + result.payout);
      updateBet(bet.id, {
        status: "settled",
        settledAt: new Date().toISOString(),
        outcome: { status: "short", total: 0, basePoints: 0, payout: result.payout },
      });
      return;
    }
    updateBalance(state.balance + result.outcome.payout);
    updateBet(bet.id, {
      status: "settled",
      settledAt: new Date().toISOString(),
      outcome: result.outcome,
    });
  }

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Open bets</h2>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {openBets.length} active
            {lastUpdated && ` · updated ${new Date(lastUpdated).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`}
          </span>
          <button
            type="button"
            onClick={refresh}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            Refresh
          </button>
        </div>
      </div>
      <ul className="mt-6 space-y-4">
        {openBets.map((bet) => (
          <BetRow
            key={bet.id}
            bet={bet}
            runs={
              runsBySportDate.get(scoreKey(bet.sport, bet.slateDate)) ??
              new Map()
            }
            onCancel={() => cancel(bet)}
            onSettle={(runs) => settle(bet, runs)}
          />
        ))}
      </ul>
    </section>
  );
}

function BetRow({
  bet,
  runs,
  onCancel,
  onSettle,
}: {
  bet: Bet;
  runs: RunsMap;
  onCancel: () => void;
  onSettle: (runs: RunsMap) => void;
}) {
  const lambda = lambdaFor(bet.sport);
  const probs = handProbabilities(bet.teams.length, lambda);
  const progress = computeBetProgress(bet, runs);
  const placed = new Date(bet.createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const canSettle = progress.allFinalOrVoided;
  const totalLabel = `${progress.liveTotal} / 21`;
  const totalTint =
    progress.liveTotal > 21
      ? "text-rose-300"
      : progress.liveTotal === 21
        ? "text-emerald-300"
        : progress.liveTotal >= 15
          ? "text-amber-200"
          : "text-zinc-200";
  const inZone =
    progress.liveTotal >= ZONE_LOW && progress.liveTotal <= TARGET;
  const livePayout = progress.allVoided
    ? bet.stake
    : inZone
      ? payoutForTotal(bet.teams.length, progress.liveTotal, bet.stake, lambda)
      : 0;
  const payoutTint = progress.allVoided
    ? "text-zinc-200"
    : progress.liveTotal === TARGET
      ? "text-emerald-300"
      : inZone
        ? "text-amber-200"
        : "text-zinc-600";
  const payoutLabel = progress.allVoided
    ? `${bet.stake}`
    : inZone
      ? livePayout.toFixed(1)
      : "\u2014";
  const payoutSub = progress.allVoided
    ? "refund"
    : progress.allFinalOrVoided
      ? "final"
      : "if settles now";

  return (
    <li className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <SportBadge sport={bet.sport} />
            {bet.teams.map((t) => {
              const s = progress.perTeam.find((p) => p.teamId === t.id)?.score ?? null;
              return <TeamChip key={t.id} abbr={t.abbr} score={s} />;
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {bet.teams.length} teams · placed {placed} · win {(probs.pZone * 100).toFixed(0)}% · bj {(probs.pBj * 100).toFixed(1)}%
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Total
            </p>
            <p className={`text-2xl font-semibold ${totalTint}`}>{totalLabel}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Payout
            </p>
            <p className={`text-2xl font-semibold ${payoutTint}`}>{payoutLabel}</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
              {payoutSub}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Stake
            </p>
            <p className="text-lg font-semibold text-zinc-100">{bet.stake}</p>
          </div>
          <div className="flex flex-col gap-2">
            {canSettle ? (
              <button
                type="button"
                onClick={() => onSettle(runs)}
                className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-500/20"
              >
                Settle
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            )}
            <MockSettleButton bet={bet} onSettle={onSettle} />
          </div>
        </div>
      </div>
    </li>
  );
}

function SportBadge({ sport }: { sport: Sport }) {
  const cls =
    sport === "nhl"
      ? "border-sky-400/40 bg-sky-400/10 text-sky-200"
      : "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  return (
    <span
      className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] ${cls}`}
    >
      {sport}
    </span>
  );
}

function TeamChip({ abbr, score }: { abbr: string; score: TeamScore | null }) {
  const base =
    "rounded-md border px-2 py-0.5 font-mono text-xs flex items-center gap-1.5";
  if (!score || score.status === "scheduled") {
    return (
      <span className={`${base} border-zinc-700 bg-zinc-900 text-zinc-300`}>
        <span>{abbr}</span>
        <span className="text-zinc-500">—</span>
      </span>
    );
  }
  if (score.status === "voided") {
    return (
      <span className={`${base} border-zinc-600 bg-zinc-800 text-zinc-400 line-through`}>
        <span>{abbr}</span>
        <span>VOID</span>
      </span>
    );
  }
  const color =
    score.status === "final"
      ? "border-zinc-600 bg-zinc-800 text-zinc-100"
      : "border-amber-400/40 bg-amber-400/10 text-amber-100";
  const liveSuffix =
    score.status === "live" && score.inningOrdinal
      ? ` ${score.inningHalf === "Top" ? "▲" : "▼"}${score.inning ?? ""}`
      : "";
  return (
    <span className={`${base} ${color}`} title={score.status === "live" ? `${score.inningOrdinal ?? ""} ${score.inningHalf ?? ""}`.trim() : score.status}>
      <span>{abbr}</span>
      <span className="font-semibold">{score.runs}</span>
      {score.status === "final" ? (
        <span className="text-[9px] uppercase tracking-wider text-zinc-400">F</span>
      ) : liveSuffix ? (
        <span className="text-[9px] uppercase tracking-wider text-amber-300">
          {liveSuffix.trim()}
        </span>
      ) : null}
    </span>
  );
}

function MockSettleButton({
  bet,
  onSettle,
}: {
  bet: Bet;
  onSettle: (runs: RunsMap) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<number, string>>(() =>
    Object.fromEntries(bet.teams.map((t) => [t.id, ""])),
  );

  function apply() {
    const perTeam: Record<number, number> = {};
    for (const t of bet.teams) {
      const v = Number(values[t.id] ?? "0");
      perTeam[t.id] = Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
    }
    onSettle(buildMockRunsMap(bet, perTeam));
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-dashed border-zinc-700 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 hover:border-amber-400/50 hover:text-amber-200"
      >
        Dev · force settle
      </button>
    );
  }

  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-amber-200">
        Mock runs
      </div>
      <div className="space-y-1">
        {bet.teams.map((t) => (
          <label key={t.id} className="flex items-center gap-2 text-xs text-zinc-300">
            <span className="w-10 font-mono">{t.abbr}</span>
            <input
              type="number"
              min={0}
              max={30}
              value={values[t.id] ?? ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [t.id]: e.target.value }))
              }
              className="w-14 rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-right"
            />
          </label>
        ))}
      </div>
      <div className="mt-2 flex gap-1.5">
        <button
          type="button"
          onClick={apply}
          className="flex-1 rounded border border-emerald-500/50 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-200 hover:bg-emerald-500/20"
        >
          Settle
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
