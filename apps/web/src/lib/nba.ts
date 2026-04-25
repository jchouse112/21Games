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

export type NbaPlayerThreeStats = {
  gamesPlayed: number | null;
  avgMinutes: number | null;
  avgThreePointersMade: number | null;
  avgThreePointersAttempted: number | null;
  threePointPct: number | null;
  threePointersMade: number | null;
  threePointersAttempted: number | null;
};

interface NbaStatsCategoryMeta {
  name?: string;
  names?: string[];
}

interface NbaStatsCategoryValues {
  name?: string;
  values?: number[];
  totals?: string[];
}

interface NbaStatsByAthleteEntry {
  athlete?: { id?: string };
  categories?: NbaStatsCategoryValues[];
}

export interface NbaStatsByAthleteResponse {
  categories?: NbaStatsCategoryMeta[];
  athletes?: NbaStatsByAthleteEntry[];
}

const NBA_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";
const NBA_TEAM_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams";
const NBA_SUMMARY_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";
const NBA_STATS_BY_ATHLETE_URL =
  "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete";

const ESPN_TTL_SECONDS = 60;

export function toEspnNbaDate(isoDate: string): string {
  return isoDate.replace(/-/g, "");
}

export function nbaEspnSeasonFromDate(isoDate: string): number {
  const [yearRaw, monthRaw] = isoDate.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return new Date().getUTCFullYear();
  }
  return month >= 10 ? year + 1 : year;
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

export async function fetchNbaThreePointStatsMap(
  date: string,
): Promise<Map<number, NbaPlayerThreeStats>> {
  const params = new URLSearchParams({
    region: "us",
    lang: "en",
    contentorigin: "espn",
    isqualified: "false",
    season: String(nbaEspnSeasonFromDate(date)),
    seasontype: "2",
    limit: "1000",
    sort: "offensive.avgThreePointFieldGoalsMade:desc",
  });
  const response = await fetchEspnJson<NbaStatsByAthleteResponse>(
    `${NBA_STATS_BY_ATHLETE_URL}?${params.toString()}`,
  );
  return extractNbaThreePointStatsMap(response);
}

export function parseNbaMadeThrees(labels?: string[], stats?: string[]): number {
  const idx = labels?.findIndex((label) => label.toUpperCase() === "3PT") ?? -1;
  if (idx < 0) return 0;
  const raw = stats?.[idx];
  if (!raw) return 0;
  const made = Number(raw.split("-")[0]);
  return Number.isFinite(made) ? made : 0;
}

function athleteStat(
  response: NbaStatsByAthleteResponse,
  entry: NbaStatsByAthleteEntry,
  categoryName: string,
  statName: string,
): number | null {
  const categoryIndex = response.categories?.findIndex((c) => c.name === categoryName) ?? -1;
  if (categoryIndex < 0) return null;
  const statIndex = response.categories?.[categoryIndex]?.names?.indexOf(statName) ?? -1;
  if (statIndex < 0) return null;
  const category =
    entry.categories?.find((c) => c.name === categoryName) ?? entry.categories?.[categoryIndex];
  const value = category?.values?.[statIndex];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(category?.totals?.[statIndex]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function extractNbaThreePointStatsMap(
  response: NbaStatsByAthleteResponse,
): Map<number, NbaPlayerThreeStats> {
  const map = new Map<number, NbaPlayerThreeStats>();
  for (const entry of response.athletes ?? []) {
    const id = Number(entry.athlete?.id);
    if (!Number.isFinite(id)) continue;
    map.set(id, {
      gamesPlayed: athleteStat(response, entry, "general", "gamesPlayed"),
      avgMinutes: athleteStat(response, entry, "general", "avgMinutes"),
      avgThreePointersMade: athleteStat(
        response,
        entry,
        "offensive",
        "avgThreePointFieldGoalsMade",
      ),
      avgThreePointersAttempted: athleteStat(
        response,
        entry,
        "offensive",
        "avgThreePointFieldGoalsAttempted",
      ),
      threePointPct: athleteStat(response, entry, "offensive", "threePointFieldGoalPct"),
      threePointersMade: athleteStat(response, entry, "offensive", "threePointFieldGoalsMade"),
      threePointersAttempted: athleteStat(
        response,
        entry,
        "offensive",
        "threePointFieldGoalsAttempted",
      ),
    });
  }
  return map;
}