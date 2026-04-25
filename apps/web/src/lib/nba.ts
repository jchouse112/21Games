export interface NbaStatusType {
  state?: string;
  completed?: boolean;
  description?: string;
  detail?: string;
  shortDetail?: string;
}

export interface NbaStatus {
  clock?: number;
  displayClock?: string;
  period?: number;
  type?: NbaStatusType;
}

export interface NbaTeamSide {
  id?: string;
  abbreviation?: string;
  displayName?: string;
  shortDisplayName?: string;
  name?: string;
}

export interface NbaCompetitor {
  id?: string;
  homeAway?: "home" | "away";
  score?: string;
  team?: NbaTeamSide;
}

export interface NbaCompetition {
  id?: string;
  date?: string;
  startDate?: string;
  status?: NbaStatus;
  venue?: { fullName?: string };
  competitors?: NbaCompetitor[];
}

export interface NbaEvent {
  id: string;
  date: string;
  status?: NbaStatus;
  venue?: { displayName?: string };
  competitions?: NbaCompetition[];
}

export interface NbaScoreboardResponse {
  events?: NbaEvent[];
}

export interface NbaRosterAthlete {
  id?: string;
  displayName?: string;
  shortName?: string;
  jersey?: string;
  position?: { abbreviation?: string; displayName?: string };
  status?: { type?: string; name?: string; abbreviation?: string };
}

export interface NbaRosterResponse {
  athletes?: NbaRosterAthlete[];
}

export interface NbaBoxscoreAthlete {
  athlete?: { id?: string; displayName?: string };
  stats?: string[];
}

export interface NbaBoxscoreStatistic {
  labels?: string[];
  athletes?: NbaBoxscoreAthlete[];
}

export interface NbaBoxscoreTeam {
  team?: { id?: string; abbreviation?: string; displayName?: string };
  statistics?: NbaBoxscoreStatistic[];
}

export interface NbaSummaryResponse {
  boxscore?: { players?: NbaBoxscoreTeam[] };
  header?: { competitions?: NbaCompetition[] };
}

const NBA_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const NBA_TEAM_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const NBA_SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";

const ESPN_TTL_SECONDS = 60;

export function toEspnNbaDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

async function fetchEspnJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    next: { revalidate: ESPN_TTL_SECONDS },
    headers: { "User-Agent": "play21games/1.0" },
  });
  if (!res.ok) {
    throw new Error(`ESPN NBA API ${res.status}: ${await res.text().catch(() => "")}`);
  }
  return (await res.json()) as T;
}

export async function fetchNbaScoreboard(
  date: string,
): Promise<NbaScoreboardResponse> {
  return fetchEspnJson<NbaScoreboardResponse>(
    `${NBA_SCOREBOARD_URL}?dates=${toEspnNbaDate(date)}`,
  );
}

export async function fetchNbaTeamRoster(
  teamId: number | string,
): Promise<NbaRosterResponse> {
  return fetchEspnJson<NbaRosterResponse>(`${NBA_TEAM_URL}/${teamId}/roster`);
}

export async function fetchNbaSummary(
  eventId: number | string,
): Promise<NbaSummaryResponse> {
  return fetchEspnJson<NbaSummaryResponse>(`${NBA_SUMMARY_URL}?event=${eventId}`);
}

export function parseNbaMadeThrees(labels?: string[], stats?: string[]): number {
  const idx = labels?.findIndex((label) => label.toUpperCase() === "3PT") ?? -1;
  if (idx < 0) return 0;
  const raw = stats?.[idx];
  if (!raw) return 0;
  const made = Number(raw.split("-")[0]);
  return Number.isFinite(made) ? made : 0;
}