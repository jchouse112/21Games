export interface ScheduleGame {
  gamePk: number;
  gameDate: string;
  officialDate?: string;
  gameNumber?: number;
  doubleHeader?: string;
  status: { detailedState: string };
  teams: {
    away: { team: { id: number; name: string }; score?: number };
    home: { team: { id: number; name: string }; score?: number };
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

export type MlbTeam = { id: number; name: string; abbr: string };

const SCHEDULE_URL =
  "https://statsapi.mlb.com/api/v1/schedule?sportId=1&gameType=R";
const TEAMS_URL = "https://statsapi.mlb.com/api/v1/teams?sportId=1";

const SCHEDULE_TTL_SECONDS = 300;
const TEAMS_TTL_SECONDS = 86_400;

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
  if (!res.ok) {
    throw new Error(`MLB teams API ${res.status}`);
  }
  const data = (await res.json()) as TeamsResponse;
  const map = new Map<number, MlbTeam>();
  for (const team of data.teams ?? []) {
    map.set(team.id, {
      id: team.id,
      name: team.name,
      abbr: team.abbreviation,
    });
  }
  return map;
}
