import {
  fetchMlbSchedule,
  fetchMlbTeamsMap,
  fetchPitcherStatsMap,
  formatPitcherName,
} from "./mlb";

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

export function getTodayIsoDateEt(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
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
