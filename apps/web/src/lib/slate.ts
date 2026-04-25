import {
  fetchMlbSchedule,
  fetchMlbTeamsMap,
  fetchPitcherStatsMap,
  formatPitcherName,
} from "./mlb";
import {
  displayNhlTeamName,
  fetchNhlGoaliesByTeam,
  fetchNhlSchedule,
  fetchNhlTeamsMap,
  pickScheduledDay,
  type NhlGoalie,
} from "./nhl";
import {
  fetchNbaScoreboard,
  fetchNbaTeamRoster,
  fetchNbaThreePointStatsMap,
  type NbaCompetitor,
  type NbaPlayerThreeStats,
  type NbaRosterAthlete,
} from "./nba";
import { fetchSoccerScoreboard, type SoccerCompetitor } from "./soccer";

export type TeamEntry = {
  id: number;
  abbr: string;
  name: string;
  pitcher: string | null;
  era: string | null;
};

export type SlateGame = {
  id: string;
  startsAtIso: string;
  timeLabel: string;
  venue: string;
  away: TeamEntry;
  home: TeamEntry;
};

export type Slate = {
  date: string;
  games: SlateGame[];
};

export type NhlTeamEntry = {
  id: number;
  abbr: string;
  name: string;
  goalies: NhlGoalie[];
};

export type NhlSlateGame = {
  id: string;
  startsAtIso: string;
  timeLabel: string;
  venue: string;
  away: NhlTeamEntry;
  home: NhlTeamEntry;
};

export type NhlSlate = {
  date: string;
  games: NhlSlateGame[];
};

export type SoccerTeamEntry = {
  id: number;
  abbr: string;
  name: string;
};

export type SoccerSlateGame = {
  id: string;
  startsAtIso: string;
  timeLabel: string;
  venue: string;
  away: SoccerTeamEntry;
  home: SoccerTeamEntry;
};

export type SoccerSlate = {
  date: string;
  games: SoccerSlateGame[];
};

export type NbaTeamEntry = {
  id: number;
  abbr: string;
  name: string;
};

export type NbaPlayerEntry = {
  id: number;
  abbr: string;
  name: string;
  teamId: number;
  teamAbbr: string;
  teamName: string;
  position: string | null;
  jersey: string | null;
  gameId: string;
  startsAtIso: string;
  threePointStats: NbaPlayerThreeStats | null;
};

export type NbaSlateGame = {
  id: string;
  startsAtIso: string;
  timeLabel: string;
  venue: string;
  away: NbaTeamEntry;
  home: NbaTeamEntry;
  players: NbaPlayerEntry[];
};

export type NbaSlate = {
  date: string;
  games: NbaSlateGame[];
};

export type SlateDay = "today" | "tomorrow";

export function normalizeSlateDay(value: unknown): SlateDay {
  if (Array.isArray(value)) return normalizeSlateDay(value[0]);
  return value === "tomorrow" ? "tomorrow" : "today";
}

export function getTodayIsoDateEt(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addIsoDateDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(year!, month! - 1, day! + days, 12, 0, 0));
  return dt.toISOString().slice(0, 10);
}

export function getSlateDateEt(day: SlateDay): string {
  const today = getTodayIsoDateEt();
  return day === "tomorrow" ? addIsoDateDays(today, 1) : today;
}

function formatEtTime(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  }).format(new Date(iso));
}

export async function getTodaySlate(date?: string): Promise<Slate> {
  const isoDate = date ?? getTodayIsoDateEt();
  const [schedule, teamsMap] = await Promise.all([
    fetchMlbSchedule(isoDate),
    fetchMlbTeamsMap(),
  ]);

  const rawGames = schedule.dates?.[0]?.games ?? [];
  const game1Only = rawGames.filter((g) => (g.gameNumber ?? 1) <= 1);

  const eligibleGames = game1Only.filter(
    (g) =>
      teamsMap.has(g.teams.away.team.id) &&
      teamsMap.has(g.teams.home.team.id),
  );

  const pitcherIds = new Set<number>();
  for (const g of eligibleGames) {
    const awayPid = g.teams.away.probablePitcher?.id;
    const homePid = g.teams.home.probablePitcher?.id;
    if (awayPid) pitcherIds.add(awayPid);
    if (homePid) pitcherIds.add(homePid);
  }

  const pitcherStats = await fetchPitcherStatsMap(Array.from(pitcherIds));

  const games: SlateGame[] = eligibleGames
    .map((g) => {
      const awayTeam = teamsMap.get(g.teams.away.team.id)!;
      const homeTeam = teamsMap.get(g.teams.home.team.id)!;
      const awayPid = g.teams.away.probablePitcher?.id;
      const homePid = g.teams.home.probablePitcher?.id;
      return {
        id: String(g.gamePk),
        startsAtIso: g.gameDate,
        timeLabel: formatEtTime(g.gameDate),
        venue: g.venue?.name ?? "",
        away: {
          id: awayTeam.id,
          abbr: awayTeam.abbr,
          name: awayTeam.name,
          pitcher: formatPitcherName(g.teams.away.probablePitcher),
          era: awayPid ? pitcherStats.get(awayPid)?.displayEra ?? null : null,
        },
        home: {
          id: homeTeam.id,
          abbr: homeTeam.abbr,
          name: homeTeam.name,
          pitcher: formatPitcherName(g.teams.home.probablePitcher),
          era: homePid ? pitcherStats.get(homePid)?.displayEra ?? null : null,
        },
      };
    })
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));

  return { date: isoDate, games };
}


export async function getTodayNhlSlate(date?: string): Promise<NhlSlate> {
  const isoDate = date ?? getTodayIsoDateEt();
  const [schedule, teamsMap, goaliesByTeam] = await Promise.all([
    fetchNhlSchedule(isoDate),
    fetchNhlTeamsMap(),
    fetchNhlGoaliesByTeam().catch(() => new Map<string, NhlGoalie[]>()),
  ]);

  const rawGames = pickScheduledDay(schedule, isoDate);
  const eligibleGames = rawGames.filter((g) => {
    if (g.gameScheduleState && g.gameScheduleState !== "OK") return false;
    return teamsMap.has(g.awayTeam.id) && teamsMap.has(g.homeTeam.id);
  });

  const games: NhlSlateGame[] = eligibleGames
    .map((g) => {
      const awayTeam = teamsMap.get(g.awayTeam.id)!;
      const homeTeam = teamsMap.get(g.homeTeam.id)!;
      const startsAtIso = g.startTimeUTC;
      return {
        id: String(g.id),
        startsAtIso,
        timeLabel: formatEtTime(startsAtIso),
        venue: g.venue?.default ?? "",
        away: {
          id: awayTeam.id,
          abbr: awayTeam.abbr,
          name: displayNhlTeamName(g.awayTeam) || awayTeam.name,
          goalies: goaliesByTeam.get(awayTeam.abbr) ?? [],
        },
        home: {
          id: homeTeam.id,
          abbr: homeTeam.abbr,
          name: displayNhlTeamName(g.homeTeam) || homeTeam.name,
          goalies: goaliesByTeam.get(homeTeam.abbr) ?? [],
        },
      };
    })
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));

  return { date: isoDate, games };
}

function soccerTeamEntry(c: SoccerCompetitor): SoccerTeamEntry | null {
  const id = Number(c.team?.id ?? c.id);
  if (!Number.isFinite(id)) return null;
  const abbr = c.team?.abbreviation ?? String(id);
  return {
    id,
    abbr,
    name: c.team?.displayName ?? c.team?.shortDisplayName ?? c.team?.name ?? abbr,
  };
}

export async function getTodaySoccerSlate(date?: string): Promise<SoccerSlate> {
  const isoDate = date ?? getTodayIsoDateEt();
  const scoreboard = await fetchSoccerScoreboard(isoDate);

  const games: SoccerSlateGame[] = [];
  for (const event of scoreboard.events ?? []) {
    const competition = event.competitions?.[0];
    if (!competition) continue;
    const awayRaw = competition.competitors?.find((c) => c.homeAway === "away");
    const homeRaw = competition.competitors?.find((c) => c.homeAway === "home");
    if (!awayRaw || !homeRaw) continue;
    const away = soccerTeamEntry(awayRaw);
    const home = soccerTeamEntry(homeRaw);
    if (!away || !home) continue;
    const startsAtIso = competition.startDate ?? competition.date ?? event.date;
    games.push({
      id: String(competition.id ?? event.id),
      startsAtIso,
      timeLabel: formatEtTime(startsAtIso),
      venue: competition.venue?.fullName ?? event.venue?.displayName ?? "",
      away,
      home,
    });
  }

  games.sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));
  return { date: isoDate, games };
}

function nbaTeamEntry(c: NbaCompetitor): NbaTeamEntry | null {
  const id = Number(c.team?.id ?? c.id);
  if (!Number.isFinite(id)) return null;
  const abbr = c.team?.abbreviation ?? String(id);
  return {
    id,
    abbr,
    name: c.team?.displayName ?? c.team?.shortDisplayName ?? c.team?.name ?? abbr,
  };
}

function nbaPlayerEntry(
  athlete: NbaRosterAthlete,
  team: NbaTeamEntry,
  gameId: string,
  startsAtIso: string,
  statsByPlayer: Map<number, NbaPlayerThreeStats>,
): NbaPlayerEntry | null {
  const id = Number(athlete.id);
  if (!Number.isFinite(id)) return null;
  const status = athlete.status?.type?.toLowerCase();
  if (status && status !== "active") return null;
  const name = athlete.displayName ?? athlete.shortName ?? String(id);
  return {
    id,
    abbr: athlete.shortName ?? name,
    name,
    teamId: team.id,
    teamAbbr: team.abbr,
    teamName: team.name,
    position: athlete.position?.abbreviation ?? null,
    jersey: athlete.jersey ?? null,
    gameId,
    startsAtIso,
    threePointStats: statsByPlayer.get(id) ?? null,
  };
}

function descStat(value: number | null | undefined): number {
  return value ?? -1;
}

function compareNbaShooters(a: NbaPlayerEntry, b: NbaPlayerEntry): number {
  return (
    descStat(b.threePointStats?.avgThreePointersMade) -
      descStat(a.threePointStats?.avgThreePointersMade) ||
    descStat(b.threePointStats?.avgThreePointersAttempted) -
      descStat(a.threePointStats?.avgThreePointersAttempted) ||
    descStat(b.threePointStats?.avgMinutes) - descStat(a.threePointStats?.avgMinutes) ||
    a.name.localeCompare(b.name)
  );
}

async function nbaPlayersForTeam(
  team: NbaTeamEntry,
  gameId: string,
  startsAtIso: string,
  statsByPlayer: Map<number, NbaPlayerThreeStats>,
): Promise<NbaPlayerEntry[]> {
  const roster = await fetchNbaTeamRoster(team.id).catch(() => null);
  return (roster?.athletes ?? [])
    .map((athlete) => nbaPlayerEntry(athlete, team, gameId, startsAtIso, statsByPlayer))
    .filter((p): p is NbaPlayerEntry => p !== null)
    .sort(compareNbaShooters);
}

export async function getTodayNbaSlate(date?: string): Promise<NbaSlate> {
  const isoDate = date ?? getTodayIsoDateEt();
  const [scoreboard, statsByPlayer] = await Promise.all([
    fetchNbaScoreboard(isoDate),
    fetchNbaThreePointStatsMap(isoDate).catch(() => new Map<number, NbaPlayerThreeStats>()),
  ]);

  const games = await Promise.all(
    (scoreboard.events ?? []).map(async (event): Promise<NbaSlateGame | null> => {
      const competition = event.competitions?.[0];
      if (!competition) return null;
      const awayRaw = competition.competitors?.find((c) => c.homeAway === "away");
      const homeRaw = competition.competitors?.find((c) => c.homeAway === "home");
      if (!awayRaw || !homeRaw) return null;
      const away = nbaTeamEntry(awayRaw);
      const home = nbaTeamEntry(homeRaw);
      if (!away || !home) return null;
      const id = String(competition.id ?? event.id);
      const startsAtIso = competition.startDate ?? competition.date ?? event.date;
      const [awayPlayers, homePlayers] = await Promise.all([
        nbaPlayersForTeam(away, id, startsAtIso, statsByPlayer),
        nbaPlayersForTeam(home, id, startsAtIso, statsByPlayer),
      ]);
      return {
        id,
        startsAtIso,
        timeLabel: formatEtTime(startsAtIso),
        venue: competition.venue?.fullName ?? event.venue?.displayName ?? "",
        away,
        home,
        players: [...awayPlayers, ...homePlayers],
      };
    }),
  );

  return {
    date: isoDate,
    games: games
      .filter((g): g is NbaSlateGame => g !== null)
      .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso)),
  };
}
