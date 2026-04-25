export type Sport = "mlb" | "nhl" | "soccer" | "nba";

export const SPORTS: Sport[] = ["mlb", "nhl", "soccer", "nba"];

export const DEFAULT_SPORT: Sport = "mlb";

export function isSport(value: unknown): value is Sport {
  return value === "mlb" || value === "nhl" || value === "soccer" || value === "nba";
}

export function scoreKey(sport: Sport, date: string): string {
  return `${sport}|${date}`;
}
