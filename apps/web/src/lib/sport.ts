export type Sport = "mlb" | "nhl";

export const SPORTS: Sport[] = ["mlb", "nhl"];

export const DEFAULT_SPORT: Sport = "mlb";

export function isSport(value: unknown): value is Sport {
  return value === "mlb" || value === "nhl";
}

export function scoreKey(sport: Sport, date: string): string {
  return `${sport}|${date}`;
}
