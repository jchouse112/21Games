"use client";

import { useEffect, useMemo, useState } from "react";
import { useBets } from "@/lib/use-bets";
import { useDevUser } from "@/lib/use-dev-user";
import { useLiveScores } from "@/lib/use-live-scores";
import {
  HIT_COST_FRAC,
  MAX_TEAMS,
  handProbabilities,
  lambdaFor,
  payoutForTotal,
  ZONE_LOW,
  TARGET,
} from "@/lib/odds";
import {
  computeBetProgress,
  deriveInstantBust,
  deriveSettlement,
  type RunsMap,
  type TeamScore,
} from "@/lib/settlement";
import type { Bet, BetTeam } from "@/lib/bets";
import { scoreKey, type Sport } from "@/lib/sport";
import { HitPicker } from "./_hit-picker";

export function ActiveBets() {
  const { openBets, removeBet, updateBet, addTeamToBet } = useBets();
  const { state, updateBalance } = useDevUser();
  const [hitTarget, setHitTarget] = useState<Bet | null>(null);

  const targets = useMemo(
    () => openBets.map((b) => ({ sport: b.sport, date: b.slateDate })),
    [openBets],
  );
  const { runsBySportDate, lastUpdated, refresh } = useLiveScores(targets);

  useEffect(() => {
    for (const bet of openBets) {
      const runs =
        runsBySportDate.get(scoreKey(bet.sport, bet.slateDate)) ?? new Map();
      const bust = deriveInstantBust(bet, runs);
      if (bust) {
        updateBet(bet.id, {
          status: "settled",
          settledAt: new Date().toISOString(),
          outcome: bust,
        });
      }
    }
  }, [openBets, runsBySportDate, updateBet]);

  if (openBets.length === 0) return null;

  function cancel(bet: Bet) {
    updateBalance(state.balance + bet.stake);
    removeBet(bet.id);
  }

  function hit(bet: Bet, team: BetTeam) {
    const result = addTeamToBet(bet.id, team, state.balance);
    if (!result.ok) return result;
    updateBalance(state.balance - result.hitCost);
    return result;
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
            onRequestHit={() => setHitTarget(bet)}
            balance={state.balance}
          />
        ))}
      </ul>
      {hitTarget ? (
        <HitPicker
          bet={hitTarget}
          onClose={() => setHitTarget(null)}
          onPick={(team) => {
            const res = hit(hitTarget, team);
            if (res?.ok) setHitTarget(null);
            return res;
          }}
        />
      ) : null}
    </section>
  );
}

function BetRow({
  bet,
  runs,
  onCancel,
  onSettle,
  onRequestHit,
  balance,
}: {
  bet: Bet;
  runs: RunsMap;
  onCancel: () => void;
  onSettle: (runs: RunsMap) => void;
  onRequestHit: () => void;
  balance: number;
}) {
  const lambda = lambdaFor(bet.sport);
  const probs = handProbabilities(bet.teams.length, lambda);
  const progress = computeBetProgress(bet, runs);
  const placed = new Date(bet.createdAt).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const canSettle = progress.allFinalOrVoided;
  const anyGameStarted = progress.perTeam.some(
    (p) => p.score != null && p.score.status !== "scheduled",
  );
  const hitCost = bet.baseStake * HIT_COST_FRAC;
  const canHit =
    !canSettle &&
    bet.teams.length < MAX_TEAMS &&
    balance >= hitCost;
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
    ? bet.baseStake
    : inZone
      ? payoutForTotal(
          bet.teams.length,
          progress.liveTotal,
          bet.baseStake,
          lambda,
          bet.stake,
        )
      : 0;
  const payoutTint = progress.allVoided
    ? "text-zinc-200"
    : progress.liveTotal === TARGET
      ? "text-emerald-300"
      : inZone
        ? "text-amber-200"
        : "text-zinc-600";
  const payoutLabel = progress.allVoided
    ? `${bet.baseStake}`
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
            <p className="text-lg font-semibold text-zinc-100">
              {bet.stake.toFixed(bet.stake === bet.baseStake ? 0 : 2)}
            </p>
            {bet.hits.length > 0 ? (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-600">
                base {bet.baseStake} + {bet.hits.length} hit
                {bet.hits.length === 1 ? "" : "s"}
              </p>
            ) : null}
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
            ) : anyGameStarted ? (
              <span
                className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-center font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500"
                title="Cancel disabled once any game in the bet has started"
              >
                Locked
              </span>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition hover:border-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            )}
            {canHit ? (
              <button
                type="button"
                onClick={onRequestHit}
                className="rounded-md border border-amber-400/50 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                title={`Add a team for +${hitCost.toFixed(2)} (25% of base)`}
              >
                Hit · +{hitCost.toFixed(2)}
              </button>
            ) : null}
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
