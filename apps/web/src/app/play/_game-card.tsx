"use client";

import type { SlateGame, TeamEntry } from "@/lib/slate";
import { getTeamColor } from "@/lib/team-colors";

interface GameCardProps {
  game: SlateGame;
  awaySelected: boolean;
  homeSelected: boolean;
  awayDisabled: boolean;
  homeDisabled: boolean;
  onToggleTeam: (team: TeamEntry, gameId: string) => void;
}

export function GameCard({
  game,
  awaySelected,
  homeSelected,
  awayDisabled,
  homeDisabled,
  onToggleTeam,
}: GameCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 shadow-md">
      <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
          {game.timeLabel}
        </span>
        {game.venue ? (
          <span
            className="truncate text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500"
            title={game.venue}
          >
            {game.venue}
          </span>
        ) : null}
      </div>

      <TeamRow
        team={game.away}
        label="AWAY"
        hasBorder
        selected={awaySelected}
        disabled={awayDisabled}
        onToggle={() => onToggleTeam(game.away, game.id)}
      />
      <TeamRow
        team={game.home}
        label="HOME"
        hasBorder={false}
        selected={homeSelected}
        disabled={homeDisabled}
        onToggle={() => onToggleTeam(game.home, game.id)}
      />
    </article>
  );
}

interface TeamRowProps {
  team: TeamEntry;
  label: string;
  hasBorder: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function TeamRow({
  team,
  label,
  hasBorder,
  selected,
  disabled,
  onToggle,
}: TeamRowProps) {
  const showPitcher = Boolean(team.pitcher || team.era);
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
      {showPitcher ? (
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
      ) : (
        <div className="text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-600">
            TBD
          </div>
        </div>
      )}
    </button>
  );
}
