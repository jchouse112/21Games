"use client";

import { useEffect, useState } from "react";
import type { Bet, BetTeam } from "@/lib/bets";
import type { AddTeamResult } from "@/lib/use-bets";
import { useLiveScores } from "@/lib/use-live-scores";
import { isTeamHitEligible } from "@/lib/hit-window";
import { scoreKey } from "@/lib/sport";

type SlateLite = {
  date: string;
  games: Array<{
    id: string;
    startsAtIso: string;
    away: { id: number; abbr: string; name: string };
    home: { id: number; abbr: string; name: string };
  }>;
};

type PickerTeam = BetTeam & { startsAtIso: string };

export function HitPicker({
  bet,
  onClose,
  onPick,
}: {
  bet: Bet;
  onClose: () => void;
  onPick: (team: BetTeam) => AddTeamResult | undefined;
}) {
  const [slate, setSlate] = useState<SlateLite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { runsBySportDate } = useLiveScores([
    { sport: bet.sport, date: bet.slateDate },
  ]);
  const runs = runsBySportDate.get(scoreKey(bet.sport, bet.slateDate)) ?? new Map();

  useEffect(() => {
    if (bet.sport !== "mlb") return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/slate/mlb?date=${bet.slateDate}`);
        if (!r.ok) throw new Error(`${r.status}`);
        const data: SlateLite = await r.json();
        if (!cancelled) setSlate(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "load failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bet.sport, bet.slateDate]);

  const pickedIds = new Set(bet.teams.map((t) => t.id));
  const eligible: PickerTeam[] = [];
  if (slate) {
    for (const g of slate.games) {
      const startsAtIso = g.startsAtIso;
      const awayOk = isTeamHitEligible(bet.sport, runs.get(g.away.id));
      const homeOk = isTeamHitEligible(bet.sport, runs.get(g.home.id));
      if (!pickedIds.has(g.away.id) && awayOk) {
        eligible.push({ ...g.away, gameId: g.id, startsAtIso });
      }
      if (!pickedIds.has(g.home.id) && homeOk) {
        eligible.push({ ...g.home, gameId: g.id, startsAtIso });
      }
    }
  }

  function handlePick(team: PickerTeam) {
    if (pending) return;
    setPending(true);
    const { startsAtIso: _ignored, ...rest } = team;
    void _ignored;
    const teamPayload: BetTeam = { ...rest, startsAtIso: team.startsAtIso };
    const result = onPick(teamPayload);
    setPending(false);
    if (result && !result.ok) setError(result.reason);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 px-4 py-8 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Hit — add a team</h3>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 hover:text-zinc-200"
          >
            Close
          </button>
        </div>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Base {bet.baseStake} · hits {bet.hits.length} · committed {bet.stake.toFixed(2)}
        </p>
        {bet.sport !== "mlb" ? (
          <p className="mt-6 text-sm text-zinc-400">Hit is MLB-only for now.</p>
        ) : error ? (
          <p className="mt-6 text-sm text-rose-300">Couldn&apos;t load slate: {error}</p>
        ) : !slate ? (
          <p className="mt-6 text-sm text-zinc-400">Loading slate…</p>
        ) : eligible.length === 0 ? (
          <p className="mt-6 text-sm text-zinc-400">
            No eligible teams right now — all remaining games are locked or already on this bet.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {eligible.map((t) => (
              <li key={`${t.gameId}-${t.id}`}>
                <button
                  type="button"
                  onClick={() => handlePick(t)}
                  disabled={pending}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-left transition hover:border-amber-400/60 disabled:opacity-50"
                >
                  <p className="text-sm font-semibold text-zinc-100">
                    {t.abbr} <span className="text-zinc-400">· {t.name}</span>
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                    {new Date(t.startsAtIso).toLocaleTimeString(undefined, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
