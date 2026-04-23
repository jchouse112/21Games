"use client";

import { useMemo, useState } from "react";
import { getAvailableStakes } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";
import { useBets } from "@/lib/use-bets";
import { useLiveScores } from "@/lib/use-live-scores";
import { useClock } from "@/lib/use-clock";
import { isPickLocked, msUntilPickLock } from "@/lib/pick-lock";
import {
  MAX_TEAMS,
  MIN_TEAMS,
  handProbabilities,
  lambdaFor,
  previewTable,
} from "@/lib/odds";
import { generateBetId, type BetTeam } from "@/lib/bets";
import type {
  NhlSlate,
  NhlSlateGame,
  NhlTeamEntry,
  Slate,
  SlateGame,
  TeamEntry,
} from "@/lib/slate";
import type { RunsMap } from "@/lib/settlement";
import { scoreKey, type Sport } from "@/lib/sport";
import { GameCard } from "./_game-card";

type Pick = BetTeam;
type AnySlate = Slate | NhlSlate;
type AnySlateGame = SlateGame | NhlSlateGame;
type AnyTeamEntry = TeamEntry | NhlTeamEntry;

const SPORT_LABELS: Record<Sport, string> = { mlb: "MLB", nhl: "NHL" };

export function BetForm({
  sport,
  slate,
}: {
  sport: Sport;
  slate: AnySlate | null;
}) {
  const { user, state, updateBalance } = useDevUser();
  const { addBet, openBets } = useBets();
  const stakes = getAvailableStakes(state.balance);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState<number>(stakes[0] ?? 1);

  const { runsBySportDate } = useLiveScores(
    slate ? [{ sport, date: slate.date }] : [],
  );
  const runs: RunsMap = useMemo(
    () =>
      slate
        ? (runsBySportDate.get(scoreKey(sport, slate.date)) ??
          new Map<number, never>())
        : new Map(),
    [slate, sport, runsBySportDate],
  );
  const now = useClock();

  const lockInfoByGame = useMemo(() => {
    const map = new Map<
      string,
      { locked: boolean; msUntilLock: number | null }
    >();
    if (!slate) return map;
    for (const g of slate.games) {
      const status = runs.get(g.away.id)?.status ?? runs.get(g.home.id)?.status;
      const locked = isPickLocked({
        startsAtIso: g.startsAtIso,
        liveStatus: status,
        now,
      });
      const msUntil = locked
        ? null
        : msUntilPickLock({
            startsAtIso: g.startsAtIso,
            liveStatus: status,
            now,
          });
      map.set(g.id, { locked, msUntilLock: msUntil });
    }
    return map;
  }, [slate, runs, now]);

  const startedTeamIds = useMemo(() => {
    const set = new Set<number>();
    if (!slate) return set;
    for (const g of slate.games) {
      if (lockInfoByGame.get(g.id)?.locked) {
        set.add(g.away.id);
        set.add(g.home.id);
      }
    }
    return set;
  }, [slate, lockInfoByGame]);

  const effectivePicks = useMemo(
    () => picks.filter((p) => !startedTeamIds.has(p.id)),
    [picks, startedTeamIds],
  );
  const droppedPicks = picks.length - effectivePicks.length;

  const effectiveStake = stakes.includes(stake) ? stake : (stakes[0] ?? 1);
  const nTeams = effectivePicks.length;
  const canSubmit =
    nTeams >= MIN_TEAMS &&
    nTeams <= MAX_TEAMS &&
    effectiveStake <= state.balance &&
    slate !== null &&
    slate.games.length > 0;

  const lockedTeamIds = useMemo(() => {
    const set = new Set<number>();
    if (!slate) return set;
    for (const b of openBets) {
      if (b.sport !== sport) continue;
      if (b.slateDate !== slate.date) continue;
      for (const t of b.teams) set.add(t.id);
    }
    return set;
  }, [openBets, slate, sport]);

  const lambda = useMemo(() => lambdaFor(sport), [sport]);
  const preview = useMemo(
    () =>
      nTeams >= MIN_TEAMS ? previewTable(nTeams, effectiveStake, lambda) : [],
    [nTeams, effectiveStake, lambda],
  );
  const probs = useMemo(
    () => (nTeams >= MIN_TEAMS ? handProbabilities(nTeams, lambda) : null),
    [nTeams, lambda],
  );

  function togglePick(team: AnyTeamEntry, gameId: string) {
    if (lockedTeamIds.has(team.id)) return;
    if (startedTeamIds.has(team.id)) return;
    const game = slate?.games.find((g) => g.id === gameId);
    setPicks((prev) => {
      if (prev.find((p) => p.id === team.id)) {
        return prev.filter((p) => p.id !== team.id);
      }
      const effectiveCount = prev.filter(
        (p) => !startedTeamIds.has(p.id),
      ).length;
      if (effectiveCount >= MAX_TEAMS) return prev;
      return [
        ...prev,
        {
          id: team.id,
          abbr: team.abbr,
          name: team.name,
          gameId,
          startsAtIso: game?.startsAtIso,
        },
      ];
    });
  }

  function submit() {
    if (!canSubmit || !slate) return;
    addBet({
      id: generateBetId(),
      userId: user.id,
      sport,
      slateDate: slate.date,
      teams: effectivePicks,
      stake: effectiveStake,
      baseStake: effectiveStake,
      hits: [],
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
          No {SPORT_LABELS[sport]} games on {slate.date}. Check back tomorrow.
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      meta={`${slate.date} \u00b7 ${slate.games.length} game${slate.games.length === 1 ? "" : "s"}`}
    >
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {(slate.games as AnySlateGame[]).map((g) => {
          const awaySelected = picks.some((p) => p.id === g.away.id);
          const homeSelected = picks.some((p) => p.id === g.home.id);
          const awayLocked = lockedTeamIds.has(g.away.id);
          const homeLocked = lockedTeamIds.has(g.home.id);
          const info = lockInfoByGame.get(g.id);
          const started = info?.locked ?? false;
          const reason = (teamLocked: boolean) =>
            started
              ? "Game has started \u2014 picks locked"
              : teamLocked
                ? "Team is already in another open bet"
                : undefined;
          return (
            <GameCard
              key={g.id}
              sport={sport}
              game={g}
              awaySelected={awaySelected}
              homeSelected={homeSelected}
              awayDisabled={(awayLocked || started) && !awaySelected}
              homeDisabled={(homeLocked || started) && !homeSelected}
              awayDisabledReason={reason(awayLocked)}
              homeDisabledReason={reason(homeLocked)}
              awayScore={runs.get(g.away.id) ?? null}
              homeScore={runs.get(g.home.id) ?? null}
              msUntilLock={info?.msUntilLock ?? null}
              onToggleTeam={togglePick}
            />
          );
        })}
      </div>

      <BetControls
        picks={effectivePicks}
        stakes={stakes}
        stake={effectiveStake}
        setStake={setStake}
        balance={state.balance}
        preview={preview}
        probs={probs}
        canSubmit={canSubmit}
        onSubmit={submit}
        onClear={() => setPicks([])}
        lockedCount={lockedTeamIds.size}
        droppedCount={droppedPicks}
      />
    </Shell>
  );
}

function Shell({
  meta,
  children,
}: {
  meta?: string;
  children: React.ReactNode;
}) {
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
  lockedCount,
  droppedCount,
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
  lockedCount: number;
  droppedCount: number;
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
            {lockedCount > 0 ? (
              <span className="ml-2 text-zinc-600">
                &middot; {lockedCount} team{lockedCount === 1 ? "" : "s"} locked in open bets
              </span>
            ) : null}
            {droppedCount > 0 ? (
              <span className="ml-2 text-amber-400/80">
                &middot; {droppedCount} dropped (game started)
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
                  <div
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${row.isBj ? "text-emerald-300" : "text-zinc-500"}`}
                  >
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
