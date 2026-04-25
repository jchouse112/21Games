"use client";

import type { NbaPlayerEntry, NbaSlateGame } from "@/lib/slate";
import type { TeamScore } from "@/lib/settlement";
import { getTeamColor } from "@/lib/team-colors";

interface PlayerGameCardProps {
  game: NbaSlateGame;
  selectedIds: Set<number>;
  locked: boolean;
  disabledReason?: string;
  awayScore?: TeamScore | null;
  homeScore?: TeamScore | null;
  playerScores: Map<number, TeamScore>;
  msUntilLock?: number | null;
  onTogglePlayer: (player: NbaPlayerEntry, gameId: string) => void;
}

const LOCK_COUNTDOWN_WINDOW_MS = 30 * 60 * 1000;

export function PlayerGameCard({
  game,
  selectedIds,
  locked,
  disabledReason,
  awayScore,
  homeScore,
  playerScores,
  msUntilLock,
  onTogglePlayer,
}: PlayerGameCardProps) {
  const source = awayScore ?? homeScore ?? null;
  const status = source?.status ?? "scheduled";
  const isLive = status === "live";
  const isFinal = status === "final";
  const isVoided = status === "voided";
  const showScores = isLive || isFinal;
  const awayPlayers = game.players.filter((p) => p.teamId === game.away.id);
  const homePlayers = game.players.filter((p) => p.teamId === game.home.id);

  return (
    <article className={`overflow-hidden rounded-xl border shadow-md ${isVoided ? "border-zinc-800 bg-zinc-950 opacity-60" : "border-zinc-800 bg-zinc-900"}`}>
      <Header
        game={game}
        source={source}
        isLive={isLive}
        isFinal={isFinal}
        isVoided={isVoided}
        msUntilLock={msUntilLock ?? null}
      />
      <div className="grid gap-0 md:grid-cols-2">
        <PlayerColumn
          label="AWAY"
          team={game.away}
          players={awayPlayers}
          selectedIds={selectedIds}
          locked={locked}
          disabledReason={disabledReason}
          showScores={showScores}
          playerScores={playerScores}
          onToggle={(p) => onTogglePlayer(p, game.id)}
        />
        <PlayerColumn
          label="HOME"
          team={game.home}
          players={homePlayers}
          selectedIds={selectedIds}
          locked={locked}
          disabledReason={disabledReason}
          showScores={showScores}
          playerScores={playerScores}
          onToggle={(p) => onTogglePlayer(p, game.id)}
        />
      </div>
    </article>
  );
}

function Header({
  game,
  source,
  isLive,
  isFinal,
  isVoided,
  msUntilLock,
}: {
  game: NbaSlateGame;
  source: TeamScore | null;
  isLive: boolean;
  isFinal: boolean;
  isVoided: boolean;
  msUntilLock: number | null;
}) {
  const showCountdown =
    !isLive && !isFinal && !isVoided && msUntilLock !== null && msUntilLock <= LOCK_COUNTDOWN_WINDOW_MS;
  let label = game.timeLabel;
  if (isLive && source) {
    const quarter = source.period ? `Q${source.period}` : "Live";
    label = `Live ${quarter}${source.periodClock ? ` ${source.periodClock}` : ""}`;
  } else if (isFinal) label = "Final";
  else if (isVoided) label = "Postponed";
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-800 bg-zinc-950 px-4 py-3">
      <span className={`font-mono text-[11px] font-semibold uppercase tracking-[0.15em] ${isLive ? "text-rose-200" : "text-zinc-300"}`}>
        {isLive ? <span className="mr-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" /> : null}
        {label}
      </span>
      {showCountdown ? (
        <span className="rounded-sm border border-amber-400/40 bg-amber-400/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-200">
          Locks in {Math.max(1, Math.ceil(msUntilLock / 60_000))} min
        </span>
      ) : game.venue ? (
        <span className="truncate text-right font-mono text-[10px] uppercase tracking-[0.15em] text-zinc-500" title={game.venue}>{game.venue}</span>
      ) : null}
    </div>
  );
}

function PlayerColumn({
  label,
  team,
  players,
  selectedIds,
  locked,
  disabledReason,
  showScores,
  playerScores,
  onToggle,
}: {
  label: string;
  team: NbaSlateGame["away"];
  players: NbaPlayerEntry[];
  selectedIds: Set<number>;
  locked: boolean;
  disabledReason?: string;
  showScores: boolean;
  playerScores: Map<number, TeamScore>;
  onToggle: (player: NbaPlayerEntry) => void;
}) {
  return (
    <div className="border-b border-zinc-800/60 md:border-b-0 md:border-r md:last:border-r-0">
      <div className="flex items-center gap-2 border-b border-zinc-800/60 px-4 py-3">
        <span className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-[9px] font-bold text-white ${getTeamColor(team.abbr, "nba")}`}>{team.abbr}</span>
        <span className="text-sm font-semibold text-zinc-100">{team.name}</span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</span>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {players.map((player) => {
          const selected = selectedIds.has(player.id);
          const disabled = locked && !selected;
          const score = playerScores.get(player.id) ?? null;
          return (
            <button
              key={player.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              title={disabled ? disabledReason : undefined}
              onClick={() => onToggle(player)}
              className={`flex w-full items-center justify-between gap-3 border-b border-zinc-800/40 px-4 py-3 text-left transition last:border-b-0 ${selected ? "border-l-4 border-l-emerald-400 bg-emerald-400/10 pl-[calc(1rem-4px)]" : disabled ? "cursor-not-allowed opacity-40" : "hover:bg-zinc-800/50"}`}
            >
              <span>
                <span className="block text-sm font-semibold text-zinc-100">{player.name}</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                  {player.position ?? "NBA"}{player.jersey ? ` · #${player.jersey}` : ""}
                </span>
              </span>
              {showScores && score ? (
                <span className="text-right">
                  <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">3PM</span>
                  <span className={`text-2xl font-semibold leading-none ${selected ? "text-emerald-300" : "text-zinc-100"}`}>{score.runs}</span>
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}