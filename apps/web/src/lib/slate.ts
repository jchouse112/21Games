import { fetchMlbSchedule, fetchMlbTeamsMap } from "./mlb";

export type TeamEntry = {
  id: number;
  abbr: string;
  name: string;
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

  const games: SlateGame[] = game1Only
    .filter(
      (g) =>
        teamsMap.has(g.teams.away.team.id) &&
        teamsMap.has(g.teams.home.team.id),
    )
    .map((g) => {
      const away = teamsMap.get(g.teams.away.team.id)!;
      const home = teamsMap.get(g.teams.home.team.id)!;
      return {
        id: String(g.gamePk),
        startsAtIso: g.gameDate,
        timeLabel: formatEtTime(g.gameDate),
        venue: g.venue?.name ?? "",
        away: { id: away.id, abbr: away.abbr, name: away.name },
        home: { id: home.id, abbr: home.abbr, name: home.name },
      };
    })
    .sort((a, b) => a.startsAtIso.localeCompare(b.startsAtIso));

  return { date: isoDate, games };
}
