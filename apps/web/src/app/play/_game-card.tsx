"use client";

import type { SlateGame, TeamEntry } from "@/lib/slate";
import type { TeamScore } from "@/lib/settlement";
import { getTeamColor } from "@/lib/team-colors";

interface GameCardProps {
  game: SlateGame;
  awaySelected: boolean;
  homeSelected: boolean;
  awayDisabled: boolean;
  homeDisabled: boolean;
  awayScore?: TeamScore | null;
  homeScore?: TeamScore | null;
  onToggleTeam: (team: TeamEntry, gameId: string) => void;
}

export function GameCard({
  game,
  awaySelected,
  homeSelected,
  awayDisabled,
  homeDisabled,
  awayScore,
  homeScore,
  onToggleTeam,
}: GameCardProps) {
  const gameStatus =
    awayScore?.status ?? homeScore?.status ?? "scheduled";
  const isLive = gameStatus === "live";
  const isFinal = gameStatus === "final";
  const isVoided = gameStatus === "voided";
  const showScores = isLive || isFinal;

  return (
    <article
      className={`overflow-hidden rounded-xl border shadow-md ${
        isVoided
          ? "border-zinc-800 bg-zinc-950 opacity-60"
          : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <CardHeader
        game={game}
        isLive={isLive}
        isFinal={isFinal}
        isVoided={isVoided}
        awayScore={awayScore ?? null}
        homeScore={homeScore ?? null}
      />
      <TeamRow
        team={game.away}
        label="AWAY"
        hasBorder
        selected={awaySelected}
        disabled={awayDisabled}
        showScore={showScores}
        score={awayScore ?? null}
        onToggle={() => onToggleTeam(game.away, game.id)}
      />
      <TeamRow
        team={game.home}
        label="HOME"
        hasBorder={false}
        selected={homeSelected}
        disabled={homeDisabled}
        showScore={showScores}
        score={homeScore ?? null}
        onToggle={() => onToggleTeam(game.home, game.id)}
      />
    </article>
  );
}

function CardHeader({
  game,
  isLive,
  isFinal,
  isVoided,
  awayScore,
  homeScore,
}: {
  game: SlateGame;
  isLive: boolean;
  isFinal: boolean;
  isVoided: boolean;
  awayScore: TeamScore | null;
  homeScore: TeamScore | null;
}) {
  const source = awayScore ?? homeScore;
  let leftNode: React.ReactNode = (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
      {game.timeLabel}
    </span>
  );
  if (isLive && source) {
    const ord = source.inningOrdinal ?? `${source.inning ?? ""}`;
    const half = source.inningHalf === "Top" ? "\u25B2" : "\u25BC";
    leftNode = (
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-200">
          Live {half}
          {ord}
        </span>
      </span>
    );
  } else if (isFinal) {
    leftNode = (
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
        Final
      </span>
    );
  } else if (isVoided) {
    leftNode = (
      <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-500">
        Postponed
      </span>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      {leftNode}
      {game.venue ? (
        <span
          className="truncate text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500"
          title={game.venue}
        >
          {game.venue}
        </span>
      ) : null}
    </div>
  );
}

interface TeamRowProps {
  team: TeamEntry;
  label: string;
  hasBorder: boolean;
  selected: boolean;
  disabled: boolean;
  showScore: boolean;
  score: TeamScore | null;
  onToggle: () => void;
}


function TeamRow({
  team,
  label,
  hasBorder,
  selected,
  disabled,
  showScore,
  score,
  onToggle,
}: TeamRowProps) {
  const showPitcher = !showScore && Boolean(team.pitcher || team.era);
  const base =
    "w-full flex items-center justify-between px-4 py-4 transition-all duration-200 text-left";
  const borderCls = hasBorder ? "border-b border-zinc-800/60" : "";
  const stateCls = selected
    ? "border-l-4 border-l-emerald-400 bg-emerald-400/10 pl-[calc(1rem-4px)]"
    : disabled
      ? "cursor-not-allowed opacity-40"
      : "hover:bg-zinc-800/50";

  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled && !selected}
      onClick={onToggle}
      className={`${base} ${borderCls} ${stateCls}`}
      title={disabled && !selected ? "Team is already in another open bet" : undefined}
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white ${getTeamColor(team.abbr)}`}
        >
          {team.abbr}
        </div>
        <div>
          <div
            className={`text-base font-semibold ${selected ? "text-white" : "text-zinc-200"}`}
          >
            {team.name}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">
            {label}
          </div>
        </div>
      </div>
      {showScore && score ? (
        <div className="text-right">
          <div className="font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Runs
          </div>
          <div
            className={`text-3xl font-semibold leading-none ${selected ? "text-emerald-300" : "text-zinc-100"}`}
          >
            {score.runs}
          </div>
        </div>
      ) : showPitcher ? (
        <div className="text-right">
          {team.pitcher ? (
            <>
              <div className="mb-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Projected Pitcher
              </div>
              <div className="text-sm font-medium text-zinc-100">
                {team.pitcher}
              </div>
            </>
          ) : null}
          {team.era ? (
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
              {team.era} ERA
            </div>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
