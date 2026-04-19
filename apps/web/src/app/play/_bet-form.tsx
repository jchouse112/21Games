"use client";

import { useMemo, useState } from "react";
import { getAvailableStakes } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";
import { useBets } from "@/lib/use-bets";
import {
  MAX_TEAMS,
  MIN_TEAMS,
  handProbabilities,
  previewTable,
} from "@/lib/odds";
import { generateBetId, type BetTeam } from "@/lib/bets";
import type { Slate, SlateGame } from "@/lib/slate";

type Pick = BetTeam;

function teamsFromGame(g: SlateGame): [Pick, Pick] {
  return [
    { id: g.away.id, abbr: g.away.abbr, name: g.away.name, gameId: g.id },
    { id: g.home.id, abbr: g.home.abbr, name: g.home.name, gameId: g.id },
  ];
}

export function BetForm({ slate }: { slate: Slate | null }) {
  const { user, state, updateBalance } = useDevUser();
  const { addBet } = useBets();
  const stakes = getAvailableStakes(state.balance);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState<number>(stakes[0] ?? 1);

  const effectiveStake = stakes.includes(stake) ? stake : (stakes[0] ?? 1);
  const nTeams = picks.length;
  const canSubmit =
    nTeams >= MIN_TEAMS &&
    nTeams <= MAX_TEAMS &&
    effectiveStake <= state.balance &&
    slate !== null &&
    slate.games.length > 0;

  const preview = useMemo(
    () =>
      nTeams >= MIN_TEAMS
        ? previewTable(nTeams, effectiveStake)
        : [],
    [nTeams, effectiveStake],
  );
  const probs = useMemo(
    () => (nTeams >= MIN_TEAMS ? handProbabilities(nTeams) : null),
    [nTeams],
  );

  function togglePick(t: Pick) {
    setPicks((prev) => {
      if (prev.find((p) => p.id === t.id)) {
        return prev.filter((p) => p.id !== t.id);
      }
      if (prev.find((p) => p.gameId === t.gameId)) return prev;
      if (prev.length >= MAX_TEAMS) return prev;
      return [...prev, t];
    });
  }

  function submit() {
    if (!canSubmit || !slate) return;
    addBet({
      id: generateBetId(),
      userId: user.id,
      slateDate: slate.date,
      teams: picks,
      stake: effectiveStake,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    updateBalance(state.balance - effectiveStake);
    setPicks([]);
  }

  if (slate === null) {
    return (
      <Shell>
        <p className="mt-2 text-zinc-400">
          Couldn&apos;t load today&apos;s slate. Try again in a minute.
        </p>
      </Shell>
    );
  }

  if (slate.games.length === 0) {
    return (
      <Shell meta={slate.date}>
        <p className="mt-2 text-zinc-400">
          No MLB games on {slate.date}. Check back tomorrow.
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      meta={`${slate.date} \u00b7 ${slate.games.length} game${slate.games.length === 1 ? "" : "s"}`}
    >
      <ul className="mt-6 divide-y divide-zinc-800">
        {slate.games.map((g) => {
          const [away, home] = teamsFromGame(g);
          const pickedGame = picks.find((p) => p.gameId === g.id);
          return (
            <li key={g.id} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-2">
                <TeamPill team={away} picked={pickedGame?.id === away.id} disabled={!!pickedGame && pickedGame.id !== away.id} onClick={() => togglePick(away)} />
                <span className="text-xs text-zinc-500">@</span>
                <TeamPill team={home} picked={pickedGame?.id === home.id} disabled={!!pickedGame && pickedGame.id !== home.id} onClick={() => togglePick(home)} />
              </div>
              <div className="text-right">
                <div className="text-sm text-zinc-100">{g.timeLabel}</div>
                {g.venue ? (
                  <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                    {g.venue}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <BetControls
        picks={picks}
        stakes={stakes}
        stake={effectiveStake}
        setStake={setStake}
        balance={state.balance}
        preview={preview}
        probs={probs}
        canSubmit={canSubmit}
        onSubmit={submit}
        onClear={() => setPicks([])}
      />
    </Shell>
  );
}

function Shell({ meta, children }: { meta?: string; children: React.ReactNode }) {
  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Today&apos;s slate</h2>
        {meta ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {meta}
          </span>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TeamPill({
  team,
  picked,
  disabled,
  onClick,
}: {
  team: Pick;
  picked: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "rounded-md border px-3 py-1.5 font-mono text-sm transition";
  const state = picked
    ? "border-emerald-400 bg-emerald-400/10 text-emerald-200"
    : disabled
      ? "border-zinc-800 bg-zinc-900/40 text-zinc-600 cursor-not-allowed"
      : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${state}`}>
      {team.abbr}
    </button>
  );
}

function BetControls({
  picks,
  stakes,
  stake,
  setStake,
  balance,
  preview,
  probs,
  canSubmit,
  onSubmit,
  onClear,
}: {
  picks: Pick[];
  stakes: number[];
  stake: number;
  setStake: (n: number) => void;
  balance: number;
  preview: ReturnType<typeof previewTable>;
  probs: ReturnType<typeof handProbabilities> | null;
  canSubmit: boolean;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const nTeams = picks.length;
  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Your picks
          </p>
          <p className="mt-1 text-sm">
            <span className="text-zinc-100">{nTeams}</span>
            <span className="text-zinc-500"> / {MAX_TEAMS} teams</span>
            {nTeams < MIN_TEAMS ? (
              <span className="ml-2 text-zinc-500">
                ({MIN_TEAMS - nTeams} more to submit)
              </span>
            ) : null}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {picks.map((p) => (
              <span
                key={p.id}
                className="rounded-md border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 font-mono text-xs text-emerald-200"
              >
                {p.abbr}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Stake
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {stakes.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStake(s)}
                className={`rounded-md border px-3 py-1.5 font-mono text-sm transition ${s === stake ? "border-emerald-400 bg-emerald-400/10 text-emerald-200" : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-zinc-500"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {preview.length > 0 && probs ? (
        <div className="mt-6 grid gap-6 sm:grid-cols-[1fr,auto]">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Payout if total lands on
            </p>
            <div className="mt-2 grid grid-cols-7 gap-1 text-center">
              {preview.map((row) => (
                <div
                  key={row.total}
                  className={`rounded-md border px-1 py-2 ${row.isBj ? "border-emerald-400/40 bg-emerald-400/10" : "border-zinc-800 bg-zinc-900/40"}`}
                >
                  <div className={`font-mono text-[10px] uppercase tracking-[0.2em] ${row.isBj ? "text-emerald-300" : "text-zinc-500"}`}>
                    {row.total}
                    {row.isBj ? " BJ" : ""}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-zinc-100">
                    {row.payout.toFixed(1)}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Win chance
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">
              {(probs.pZone * 100).toFixed(1)}%
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              BJ chance {(probs.pBj * 100).toFixed(1)}%
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Bust {(probs.pBust * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Balance {balance} &rarr; {Math.max(0, balance - stake)} after stake
        </p>
        <button
          type="button"
          onClick={onClear}
          disabled={nTeams === 0}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-800 disabled:opacity-40"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit}
          className="rounded-md border border-emerald-400 bg-emerald-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          Place bet &mdash; {stake} {stake === 1 ? "token" : "tokens"}
        </button>
      </div>
    </div>
  );
}
