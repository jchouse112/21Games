"use client";

import type {
  NhlSlateGame,
  NhlTeamEntry,
  SlateGame,
  SoccerSlateGame,
  SoccerTeamEntry,
  TeamEntry,
} from "@/lib/slate";
import type { TeamScore } from "@/lib/settlement";
import type { Sport } from "@/lib/sport";
import { formatNhlPeriodOrdinal } from "@/lib/settlement";
import { getTeamColor } from "@/lib/team-colors";

type AnyGame = SlateGame | NhlSlateGame | SoccerSlateGame;
type AnyTeamEntry = TeamEntry | NhlTeamEntry | SoccerTeamEntry;

interface GameCardProps {
  sport: Sport;
  game: AnyGame;
  awaySelected: boolean;
  homeSelected: boolean;
  awayDisabled: boolean;
  homeDisabled: boolean;
  awayDisabledReason?: string;
  homeDisabledReason?: string;
  awayScore?: TeamScore | null;
  homeScore?: TeamScore | null;
  msUntilLock?: number | null;
  onToggleTeam: (team: AnyTeamEntry, gameId: string) => void;
}

const LOCK_COUNTDOWN_WINDOW_MS = 30 * 60 * 1000;

export function GameCard({
  sport,
  game,
  awaySelected,
  homeSelected,
  awayDisabled,
  homeDisabled,
  awayDisabledReason,
  homeDisabledReason,
  awayScore,
  homeScore,
  msUntilLock,
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
        sport={sport}
        game={game}
        isLive={isLive}
        isFinal={isFinal}
        isVoided={isVoided}
        awayScore={awayScore ?? null}
        homeScore={homeScore ?? null}
        msUntilLock={msUntilLock ?? null}
      />
      <TeamRow
        sport={sport}
        team={game.away}
        label="AWAY"
        hasBorder
        selected={awaySelected}
        disabled={awayDisabled}
        disabledReason={awayDisabledReason}
        showScore={showScores}
        score={awayScore ?? null}
        onToggle={() => onToggleTeam(game.away, game.id)}
      />
      <TeamRow
        sport={sport}
        team={game.home}
        label="HOME"
        hasBorder={false}
        selected={homeSelected}
        disabled={homeDisabled}
        disabledReason={homeDisabledReason}
        showScore={showScores}
        score={homeScore ?? null}
        onToggle={() => onToggleTeam(game.home, game.id)}
      />
    </article>
  );
}

function CardHeader({
  sport,
  game,
  isLive,
  isFinal,
  isVoided,
  awayScore,
  homeScore,
  msUntilLock,
}: {
  sport: Sport;
  game: AnyGame;
  isLive: boolean;
  isFinal: boolean;
  isVoided: boolean;
  awayScore: TeamScore | null;
  homeScore: TeamScore | null;
  msUntilLock: number | null;
}) {
  const source = awayScore ?? homeScore;
  const showCountdown =
    !isLive &&
    !isFinal &&
    !isVoided &&
    msUntilLock !== null &&
    msUntilLock <= LOCK_COUNTDOWN_WINDOW_MS;
  let leftNode: React.ReactNode = (
    <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-300">
      {game.timeLabel}
    </span>
  );
  if (isLive && source) {
    let liveLabel: string;
    if (sport === "nhl") {
      const ord =
        formatNhlPeriodOrdinal(source.period ?? null) ?? "";
      const clock = source.periodClock ? ` ${source.periodClock}` : "";
      liveLabel = `Live ${ord}${clock}`.trim();
    } else if (sport === "soccer") {
      const half = source.period === 2 ? "2nd half" : "1st half";
      const clock = source.periodClock ? ` ${source.periodClock}` : "";
      liveLabel = `Live ${half}${clock}`.trim();
    } else {
      const ord = source.inningOrdinal ?? `${source.inning ?? ""}`;
      const half = source.inningHalf === "Top" ? "\u25B2" : "\u25BC";
      liveLabel = `Live ${half}${ord}`;
    }
    leftNode = (
      <span className="flex items-center gap-2">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-rose-200">
          {liveLabel}
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
  } else if (showCountdown && msUntilLock !== null) {
    const mins = Math.max(1, Math.ceil(msUntilLock / 60_000));
    leftNode = (
      <span className="flex items-center gap-2">
        <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.15em] text-zinc-400">
          {game.timeLabel}
        </span>
        <span className="rounded-sm border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">
          Locks in {mins} min
        </span>
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
  sport: Sport;
  team: AnyTeamEntry;
  label: string;
  hasBorder: boolean;
  selected: boolean;
  disabled: boolean;
  disabledReason?: string;
  showScore: boolean;
  score: TeamScore | null;
  onToggle: () => void;
}

function isMlbTeam(team: AnyTeamEntry): team is TeamEntry {
  return "pitcher" in team;
}

function isNhlTeam(team: AnyTeamEntry): team is NhlTeamEntry {
  return "goalies" in team;
}

function TeamRow({
  sport,
  team,
  label,
  hasBorder,
  selected,
  disabled,
  disabledReason,
  showScore,
  score,
  onToggle,
}: TeamRowProps) {
  const scoreUnit = sport === "mlb" ? "Runs" : "Goals";
  const hasMeta =
    !showScore &&
    (isMlbTeam(team)
      ? Boolean(team.pitcher || team.era)
      : isNhlTeam(team) && team.goalies.length > 0);
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
      title={
        disabled && !selected
          ? (disabledReason ?? "Team is unavailable")
          : undefined
      }
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold text-white ${getTeamColor(team.abbr, sport)}`}
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
            {scoreUnit}
          </div>
          <div
            className={`text-3xl font-semibold leading-none ${selected ? "text-emerald-300" : "text-zinc-100"}`}
          >
            {score.runs}
          </div>
        </div>
      ) : hasMeta ? (
        isMlbTeam(team) ? (
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
        ) : isNhlTeam(team) ? (
          <div className="text-right">
            <div className="mb-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Goalies
            </div>
            {team.goalies.map((g) => (
              <div key={g.name} className="text-sm font-medium text-zinc-100">
                {g.name}
                {g.savePct ? (
                  <span className="ml-1 font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500">
                    {g.savePct} SV%
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null
      ) : null}
    </button>
  );
}
