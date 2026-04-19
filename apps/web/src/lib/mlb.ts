export interface ProbablePitcher {
  id: number;
  fullName: string;
}

export interface ScheduleGame {
  gamePk: number;
  gameDate: string;
  officialDate?: string;
  gameNumber?: number;
  doubleHeader?: string;
  status: { detailedState: string };
  teams: {
    away: {
      team: { id: number; name: string };
      score?: number;
      probablePitcher?: ProbablePitcher;
    };
    home: {
      team: { id: number; name: string };
      score?: number;
      probablePitcher?: ProbablePitcher;
    };
  };
  venue?: { id: number; name: string };
  linescore?: {
    currentInning?: number;
    currentInningOrdinal?: string;
    inningHalf?: string;
    teams?: {
      away?: { runs?: number };
      home?: { runs?: number };
    };
  };
}

export interface ScheduleResponse {
  dates?: Array<{ date: string; games: ScheduleGame[] }>;
}

interface TeamsResponse {
  teams: Array<{ id: number; name: string; abbreviation: string }>;
}

interface PeopleResponse {
  people: Array<{
    id: number;
    fullName: string;
    stats?: Array<{
      type?: { displayName?: string };
      group?: { displayName?: string };
      splits?: Array<{
        season?: string;
        stat?: { era?: string; gamesPlayed?: number };
      }>;
    }>;
  }>;
}

export type MlbTeam = { id: number; name: string; abbr: string };
export type PitcherStats = { id: number; displayEra: string | null };

const SCHEDULE_URL =
  "https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R&hydrate=linescore,probablePitcher";
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportId=1";
const PEOPLE_URL = "https://statsapi.mlb.com/api/v1/people";

const SCHEDULE_TTL_SECONDS = 300;
const TEAMS_TTL_SECONDS = 86_400;
const PITCHER_TTL_SECONDS = 3600;

export async function fetchMlbSchedule(
  date: string,
): Promise<ScheduleResponse> {
  const url = `${SCHEDULE_URL}&date=${date}`;
  const res = await fetch(url, {
    next: { revalidate: SCHEDULE_TTL_SECONDS },
  });
  if (!res.ok) {
    throw new Error(
      `MLB schedule API ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  return (await res.json()) as ScheduleResponse;
}

export async function fetchMlbTeamsMap(): Promise<Map<number, MlbTeam>> {
  const res = await fetch(TEAMS_URL, {
    next: { revalidate: TEAMS_TTL_SECONDS },
  });
  if (!res.ok) throw new Error(`MLB teams API ${res.status}`);
  const data = (await res.json()) as TeamsResponse;
  const map = new Map<number, MlbTeam>();
  for (const team of data.teams ?? []) {
    map.set(team.id, { id: team.id, name: team.name, abbr: team.abbreviation });
  }
  return map;
}

export async function fetchPitcherStatsMap(
  ids: number[],
): Promise<Map<number, PitcherStats>> {
  const map = new Map<number, PitcherStats>();
  if (ids.length === 0) return map;
  const url = `${PEOPLE_URL}?personIds=${ids.join(",")}&hydrate=stats(group=[pitching],type=[season,yearByYear])`;
  const res = await fetch(url, { next: { revalidate: PITCHER_TTL_SECONDS } });
  if (!res.ok) return map;
  const data = (await res.json()) as PeopleResponse;
  for (const person of data.people ?? []) {
    let seasonEra: string | null = null;
    let lastYearEra: string | null = null;
    for (const block of person.stats ?? []) {
      const type = block.type?.displayName;
      if (type === "season") {
        const sp = block.splits?.[0];
        if (sp?.stat?.era && (sp.stat.gamesPlayed ?? 0) > 0) {
          seasonEra = sp.stat.era;
        }
      } else if (type === "yearByYear") {
        const splits = block.splits ?? [];
        for (let i = splits.length - 1; i >= 0; i -= 1) {
          const sp = splits[i];
          if (sp?.stat?.era && (sp.stat.gamesPlayed ?? 0) > 0) {
            lastYearEra = sp.stat.era;
            break;
          }
        }
      }
    }
    map.set(person.id, { id: person.id, displayEra: seasonEra ?? lastYearEra });
  }
  return map;
}

export function formatPitcherName(pitcher?: ProbablePitcher): string | null {
  if (!pitcher?.fullName) return null;
  const parts = pitcher.fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!;
  const first = parts[0]!;
  const last = parts[parts.length - 1]!;
  return `${first.charAt(0).toUpperCase()}. ${last}`;
}
