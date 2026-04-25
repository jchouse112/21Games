"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getAvailableStakes } from "@/lib/dev-users";
import { useDevUser } from "@/lib/use-dev-user";
import { useBets } from "@/lib/use-bets";
import { useLiveScores } from "@/lib/use-live-scores";
import { useClock } from "@/lib/use-clock";
import { isPickLocked, msUntilPickLock } from "@/lib/pick-lock";
import {
  handProbabilities,
  lambdaFor,
  pickLimitsFor,
  previewTable,
  targetFor,
  zoneLowFor,
} from "@/lib/odds";
import { generateBetId, type BetTeam } from "@/lib/bets";
import type {
  NhlSlate,
  NhlSlateGame,
  NhlTeamEntry,
  NbaPlayerEntry,
  NbaSlate,
  NbaSlateGame,
  Slate,
  SlateDay,
  SlateGame,
  SoccerSlate,
  SoccerSlateGame,
  SoccerTeamEntry,
  TeamEntry,
} from "@/lib/slate";
import type { RunsMap } from "@/lib/settlement";
import { scoreKey, type Sport } from "@/lib/sport";
import { GameCard } from "./_game-card";
import { PlayerGameCard } from "./_player-game-card";

type Pick = BetTeam;
type AnySlate = Slate | NhlSlate | SoccerSlate | NbaSlate;
type AnySlateGame = SlateGame | NhlSlateGame | SoccerSlateGame | NbaSlateGame;
type AnyPickEntry = TeamEntry | NhlTeamEntry | SoccerTeamEntry | NbaPlayerEntry;
type PlacedBetConfirmation = {
  id: string;
  sport: Sport;
  stake: number;
  teamCount: number;
  potentialWin: number;
};

const SPORT_LABELS: Record<Sport, string> = {
  mlb: "MLB",
  nhl: "NHL",
  soccer: "MLS",
  nba: "NBA",
};

function isNbaSlateGame(game: AnySlateGame): game is NbaSlateGame {
  return "players" in game;
}

export function BetForm({
  sport,
  slate,
  day,
}: {
  sport: Sport;
  slate: AnySlate | null;
  day: SlateDay;
}) {
  const { user, state, updateBalance } = useDevUser();
  const { addBet } = useBets();
  const stakes = getAvailableStakes(state.balance);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [stake, setStake] = useState<number>(stakes[0] ?? 1);
  const [placedBet, setPlacedBet] = useState<PlacedBetConfirmation | null>(null);

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

  const lockedPickIds = useMemo(() => {
    const set = new Set<number>();
    if (!slate) return set;
    for (const g of slate.games) {
      if (lockInfoByGame.get(g.id)?.locked) {
        if (isNbaSlateGame(g)) {
          for (const player of g.players) set.add(player.id);
        } else {
          set.add(g.away.id);
          set.add(g.home.id);
        }
      }
    }
    return set;
  }, [slate, lockInfoByGame]);

  const effectivePicks = useMemo(
    () => picks.filter((p) => !lockedPickIds.has(p.id)),
    [picks, lockedPickIds],
  );
  const droppedPicks = picks.length - effectivePicks.length;

  const effectiveStake = stakes.includes(stake) ? stake : (stakes[0] ?? 1);
  const nTeams = effectivePicks.length;
  const pickLimits = useMemo(() => pickLimitsFor(sport), [sport]);
  const target = useMemo(() => targetFor(sport), [sport]);
  const zoneLow = useMemo(() => zoneLowFor(sport), [sport]);
  const canSubmit =
    nTeams >= pickLimits.min &&
    nTeams <= pickLimits.max &&
    effectiveStake <= state.balance &&
    slate !== null &&
    slate.games.length > 0;

  const lambda = useMemo(() => lambdaFor(sport), [sport]);
  const preview = useMemo(
    () =>
      nTeams >= pickLimits.min
        ? previewTable(nTeams, effectiveStake, lambda, effectiveStake, target, zoneLow)
        : [],
    [nTeams, effectiveStake, lambda, target, zoneLow, pickLimits.min],
  );
  const probs = useMemo(
    () =>
      nTeams >= pickLimits.min
        ? handProbabilities(nTeams, lambda, target, zoneLow)
        : null,
    [nTeams, lambda, target, zoneLow, pickLimits.min],
  );

  const selectedIds = useMemo(() => new Set(picks.map((p) => p.id)), [picks]);

  function togglePick(team: AnyPickEntry, gameId: string) {
    if (lockedPickIds.has(team.id)) return;
    setPlacedBet(null);
    const game = slate?.games.find((g) => g.id === gameId);
    setPicks((prev) => {
      if (prev.find((p) => p.id === team.id)) {
        return prev.filter((p) => p.id !== team.id);
      }
      const effectiveCount = prev.filter(
        (p) => !lockedPickIds.has(p.id),
      ).length;
      if (effectiveCount >= pickLimits.max) return prev;
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
    const id = generateBetId();
    const teamCount = effectivePicks.length;
    const potentialWin = Math.max(0, ...preview.map((row) => row.payout));
    addBet({
      id,
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
    setPlacedBet({ id, sport, stake: effectiveStake, teamCount, potentialWin });
  }

  if (slate === null) {
    return (
      <Shell sport={sport} day={day}>
        <p className="mt-2 text-zinc-400">
          Couldn&apos;t load this slate. Try again in a minute.
        </p>
      </Shell>
    );
  }

  if (slate.games.length === 0) {
    return (
      <Shell sport={sport} day={day} meta={slate.date}>
        <p className="mt-2 text-zinc-400">
          No {SPORT_LABELS[sport]} games on {slate.date}. Try another slate.
        </p>
      </Shell>
    );
  }

  return (
    <Shell
      sport={sport}
      day={day}
      meta={`${slate.date} \u00b7 ${slate.games.length} game${slate.games.length === 1 ? "" : "s"}`}
    >
      <div className={sport === "nba" ? "mt-6 grid gap-4" : "mt-6 grid gap-3 sm:grid-cols-2"}>
        {(slate.games as AnySlateGame[]).map((g) => {
          const info = lockInfoByGame.get(g.id);
          const started = info?.locked ?? false;
          const reason = started ? "Game has started \u2014 picks locked" : undefined;
          if (isNbaSlateGame(g)) {
            return (
              <PlayerGameCard
                key={g.id}
                game={g}
                selectedIds={selectedIds}
                locked={started}
                disabledReason={reason}
                awayScore={runs.get(g.away.id) ?? null}
                homeScore={runs.get(g.home.id) ?? null}
                playerScores={runs}
                msUntilLock={info?.msUntilLock ?? null}
                onTogglePlayer={togglePick}
              />
            );
          }
          const awaySelected = picks.some((p) => p.id === g.away.id);
          const homeSelected = picks.some((p) => p.id === g.home.id);
          return (
            <GameCard
              key={g.id}
              sport={sport}
              game={g}
              awaySelected={awaySelected}
              homeSelected={homeSelected}
              awayDisabled={started && !awaySelected}
              homeDisabled={started && !homeSelected}
              awayDisabledReason={reason}
              homeDisabledReason={reason}
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
        droppedCount={droppedPicks}
        placedBet={placedBet}
        onDismissConfirmation={() => setPlacedBet(null)}
        pickLimits={pickLimits}
        sport={sport}
      />
    </Shell>
  );
}

function Shell({
  sport,
  day,
  meta,
  children,
}: {
  sport: Sport;
  day: SlateDay;
  meta?: string;
  children: React.ReactNode;
}) {
  const title = day === "tomorrow" ? "Tomorrow's slate" : "Today's slate";
  const basePath = `/play/${sport}`;

  return (
    <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {meta ? (
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {meta}
            </span>
          ) : null}
        </div>
        <div className="flex items-center rounded-full border border-zinc-800 bg-zinc-950 p-0.5">
          <SlateDayLink href={basePath} active={day === "today"}>
            Today
          </SlateDayLink>
          <SlateDayLink href={`${basePath}?day=tomorrow`} active={day === "tomorrow"}>
            Tomorrow
          </SlateDayLink>
        </div>
      </div>
      {children}
    </section>
  );
}

function SlateDayLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
        active
          ? "bg-emerald-500/20 text-emerald-300"
          : "text-zinc-500 hover:text-zinc-200"
      }`}
    >
      {children}
    </Link>
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
  droppedCount,
  placedBet,
  onDismissConfirmation,
  pickLimits,
  sport,
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
  droppedCount: number;
  placedBet: PlacedBetConfirmation | null;
  onDismissConfirmation: () => void;
  pickLimits: { min: number; max: number };
  sport: Sport;
}) {
  const nTeams = picks.length;
  const pickNoun = sport === "nba" ? "players" : "teams";
  return (
    <div className="mt-6 border-t border-zinc-800 pt-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            Your picks
          </p>
          <p className="mt-1 text-sm">
            <span className="text-zinc-100">{nTeams}</span>
            <span className="text-zinc-500"> / {pickLimits.max} {pickNoun}</span>
            {nTeams < pickLimits.min ? (
              <span className="ml-2 text-zinc-500">
                ({pickLimits.min - nTeams} more to submit)
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
              If your total lands on
            </p>
            <div
              className={`mt-2 grid gap-1 text-center ${preview.length === 4 ? "grid-cols-4" : "grid-cols-7"}`}
            >
              {preview.map((row) => (
                <div
                  key={row.total}
                  className={`rounded-md border px-1 py-2.5 ${row.isBj ? "border-emerald-400/40 bg-emerald-400/10" : "border-zinc-800 bg-zinc-900/40"}`}
                >
                  <p
                    className={`font-mono text-[10px] uppercase tracking-[0.2em] ${row.isBj ? "text-emerald-300" : "text-zinc-500"}`}
                  >
                    Total
                  </p>
                  <p className={row.isBj ? "mt-0.5 text-sm font-semibold text-emerald-200" : "mt-0.5 text-sm font-semibold text-zinc-200"}>
                    {row.total}{row.isBj ? " BJ" : ""}
                  </p>
                  <p className="mt-2 font-mono text-[9px] uppercase tracking-[0.18em] text-zinc-500">
                    Pays
                  </p>
                  <p className="mt-0.5 text-base font-semibold leading-none text-zinc-100">
                    {row.payout.toFixed(1)}
                  </p>
                  <p className="mt-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-zinc-600">
                    tokens
                  </p>
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

      {placedBet ? (
        <PlacedBetNotice
          placedBet={placedBet}
          onDismiss={onDismissConfirmation}
          pickLimits={pickLimits}
          pickNoun={pickNoun}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
        <p className="mr-auto font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
          Balance {balance}
          {canSubmit ? <> &rarr; {Math.max(0, balance - stake)} after stake</> : null}
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

function PlacedBetNotice({
  placedBet,
  onDismiss,
  pickLimits,
  pickNoun,
}: {
  placedBet: PlacedBetConfirmation;
  onDismiss: () => void;
  pickLimits: { min: number; max: number };
  pickNoun: "teams" | "players";
}) {
  const remainingHits = pickLimits.max - placedBet.teamCount;
  const hitCutoff =
    placedBet.sport === "soccer"
      ? "before the 1st half ends"
      : placedBet.sport === "nhl"
      ? "before the 2nd period begins"
      : placedBet.sport === "nba"
      ? "before the 2nd quarter begins"
      : "before the 4th inning begins";
  const singlePickNoun = pickNoun === "players" ? "player" : "team";
  const potentialWin = placedBet.potentialWin.toFixed(
    placedBet.potentialWin % 1 === 0 ? 0 : 1,
  );

  return (
    <div className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-400/10 p-5 shadow-[0_0_40px_rgba(52,211,153,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-300">
            Ticket confirmed
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
            Bet placed
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {placedBet.teamCount}-{singlePickNoun} ticket · {placedBet.stake} token
            {placedBet.stake === 1 ? "" : "s"} staked
          </p>
        </div>
        <div className="flex items-start gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Potential win
            </p>
            <p className="mt-1 text-3xl font-semibold leading-none text-emerald-200">
              {potentialWin}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              tokens max
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500 transition hover:text-zinc-200"
          >
            Dismiss
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2">
        <p className="text-sm text-zinc-400">
          {remainingHits > 0 ? (
            <>
              Want another {singlePickNoun}? Open <span className="text-zinc-200">My Bets</span> and
              tap <span className="text-amber-200">Hit</span>. You can add up to{" "}
              {remainingHits} more for 25% of the original stake each, as long as
              that {singlePickNoun}&apos;s game is {hitCutoff}.
            </>
          ) : (
            <>This ticket already has {pickLimits.max} {pickNoun}, so Hit is maxed out.</>
          )}
        </p>
        <Link
          href="/play/my-bets"
          className="rounded-md border border-emerald-400/50 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-400/20"
        >
          View my bets
        </Link>
      </div>
    </div>
  );
}
