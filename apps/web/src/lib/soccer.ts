export interface SoccerStatusType {
  state?: string;
  completed?: boolean;
  description?: string;
  detail?: string;
  shortDetail?: string;
}

export interface SoccerStatus {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: SoccerStatusType;
}

export interface SoccerTeamSide {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
}

export interface SoccerCompetitor {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: SoccerTeamSide;
}

export interface SoccerCompetition {
  id?: string;
  date?: string;
  startDate?: string;
  status?: SoccerStatus;
  venue?: { fullName?: string };
  competitors?: SoccerCompetitor[];
}

export interface SoccerEvent {
  id: string;
  date: string;
  status?: SoccerStatus;
  venue?: { displayName?: string };
  competitions?: SoccerCompetition[];
}

export interface SoccerScoreboardResponse {
  events?: SoccerEvent[];
}

const MLS_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/usa.1/scoreboard";

const SCOREBOARD_TTL_SECONDS = 60;

export function toEspnDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

export async function fetchSoccerScoreboard(
  date: string,
): Promise<SoccerScoreboardResponse> {
  const url = `${MLS_SCOREBOARD_URL}?dates=${toEspnDate(date)}`;
  const res = await fetch(url, {
    next: { revalidate: SCOREBOARD_TTL_SECONDS },
    headers: { "User-Agent": "play21games/1.0" },
  });
  if (!res.ok) {
    throw new Error(
      `MLS scoreboard API ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  return (await res.json()) as SoccerScoreboardResponse;
}
