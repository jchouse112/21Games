export interface NhlTeamSide {
  id: number;
  abbrev: string;
  placeName?: { default: string };
  commonName?: { default: string };
  name?: { default: string };
  score?: number;
}

export interface NhlPeriodDescriptor {
  number?: number;
  periodType?: string;
}

export interface NhlClock {
  timeRemaining?: string;
  inIntermission?: boolean;
}

export interface NhlScheduleGame {
  id: number;
  gameDate?: string;
  startTimeUTC: string;
  venue?: { default: string };
  gameState: string;
  gameScheduleState?: string;
  awayTeam: NhlTeamSide;
  homeTeam: NhlTeamSide;
  periodDescriptor?: NhlPeriodDescriptor;
  clock?: NhlClock;
}

export interface NhlGameWeekDay {
  date: string;
  games: NhlScheduleGame[];
}

export interface NhlScheduleResponse {
  gameWeek?: NhlGameWeekDay[];
  games?: NhlScheduleGame[];
}

export interface NhlScoreResponse {
  currentDate?: string;
  games?: NhlScheduleGame[];
}

interface NhlTeamsRestResponse {
  data: Array<{
    id: number;
    fullName: string;
    triCode: string;
  }>;
}

export type NhlTeam = { id: number; name: string; abbr: string };
export type NhlGoalie = { name: string; savePct: string | null };

interface NhlGoalieSummaryRow {
  goalieFullName?: string | null;
  savePct?: number | null;
  gamesPlayed?: number | null;
  teamAbbrevs?: string | null;
}

interface NhlGoalieSummaryResponse {
  data?: NhlGoalieSummaryRow[];
}

const SCHEDULE_URL = "https://api-web.nhle.com/v1/schedule";
const SCORE_URL = "https://api-web.nhle.com/v1/score";
const TEAMS_URL = "https://api.nhle.com/stats/rest/en/team";
const GOALIE_SUMMARY_URL =
  "https://api.nhle.com/stats/rest/en/goalie/summary";

const SCHEDULE_TTL_SECONDS = 300;
const SCORE_TTL_SECONDS = 60;
const TEAMS_TTL_SECONDS = 86_400;
const GOALIES_TTL_SECONDS = 21_600;

export async function fetchNhlSchedule(
  date: string,
): Promise<NhlScheduleResponse> {
  const res = await fetch(`${SCHEDULE_URL}/${date}`, {
    next: { revalidate: SCHEDULE_TTL_SECONDS },
  });
  if (!res.ok) {
    throw new Error(
      `NHL schedule API ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  return (await res.json()) as NhlScheduleResponse;
}

export async function fetchNhlScore(date: string): Promise<NhlScoreResponse> {
  const res = await fetch(`${SCORE_URL}/${date}`, {
    next: { revalidate: SCORE_TTL_SECONDS },
  });
  if (!res.ok) {
    throw new Error(
      `NHL score API ${res.status}: ${await res.text().catch(() => "")}`,
    );
  }
  return (await res.json()) as NhlScoreResponse;
}

export async function fetchNhlTeamsMap(): Promise<Map<number, NhlTeam>> {
  const res = await fetch(TEAMS_URL, {
    next: { revalidate: TEAMS_TTL_SECONDS },
  });
  if (!res.ok) throw new Error(`NHL teams API ${res.status}`);
  const data = (await res.json()) as NhlTeamsRestResponse;
  const map = new Map<number, NhlTeam>();
  for (const team of data.data ?? []) {
    map.set(team.id, { id: team.id, name: team.fullName, abbr: team.triCode });
  }
  return map;
}

export function pickScheduledDay(
  schedule: NhlScheduleResponse,
  date: string,
): NhlScheduleGame[] {
  if (Array.isArray(schedule.gameWeek)) {
    const day = schedule.gameWeek.find((d) => d.date === date);
    if (day) return day.games ?? [];
  }
  if (Array.isArray(schedule.games)) {
    return schedule.games.filter((g) => {
      const iso = g.gameDate ?? g.startTimeUTC;
      return typeof iso === "string" && iso.startsWith(date);
    });
  }
  return [];
}

export function displayNhlTeamName(team: NhlTeamSide): string {
  if (team.name?.default) return team.name.default;
  const place = team.placeName?.default;
  const common = team.commonName?.default;
  if (place && common) return `${place} ${common}`;
  return common ?? place ?? team.abbrev;
}

export function currentNhlSeasonId(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return m >= 8 ? `${y}${y + 1}` : `${y - 1}${y}`;
}

export function formatNhlSavePct(raw: number | null | undefined): string | null {
  if (raw === null || raw === undefined || !Number.isFinite(raw)) return null;
  return raw.toFixed(3).replace(/^0/, "");
}

export async function fetchNhlGoaliesByTeam(
  seasonId: string = currentNhlSeasonId(),
): Promise<Map<string, NhlGoalie[]>> {
  const sort = encodeURIComponent(
    JSON.stringify([{ property: "gamesPlayed", direction: "DESC" }]),
  );
  const cayenne = encodeURIComponent(
    `seasonId=${seasonId} and gameTypeId=2`,
  );
  const url = `${GOALIE_SUMMARY_URL}?sort=${sort}&start=0&limit=200&cayenneExp=${cayenne}`;
  const res = await fetch(url, { next: { revalidate: GOALIES_TTL_SECONDS } });
  if (!res.ok) throw new Error(`NHL goalie API ${res.status}`);
  const payload = (await res.json()) as NhlGoalieSummaryResponse;
  const byTeam = new Map<string, NhlGoalie[]>();
  for (const row of payload.data ?? []) {
    const name = row.goalieFullName?.trim();
    const abbrevsRaw = row.teamAbbrevs?.trim();
    if (!name || !abbrevsRaw) continue;
    const abbrevs = abbrevsRaw.split(/[^A-Z]+/).filter(Boolean);
    const abbr = abbrevs[abbrevs.length - 1];
    if (!abbr) continue;
    const entry: NhlGoalie = {
      name,
      savePct: formatNhlSavePct(row.savePct ?? null),
    };
    const list = byTeam.get(abbr) ?? [];
    if (list.length < 2) {
      list.push(entry);
      byTeam.set(abbr, list);
    }
  }
  return byTeam;
}
