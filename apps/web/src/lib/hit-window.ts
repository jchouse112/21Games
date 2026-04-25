import type { Sport } from "./sport";
import type { TeamScore } from "./settlement";

export const MLB_HIT_CUTOFF_INNING = 4;
export const NHL_HIT_CUTOFF_PERIOD = 2;
export const SOCCER_HIT_CUTOFF_PERIOD = 2;
export const NBA_HIT_CUTOFF_PERIOD = 2;

export function isTeamHitEligible(
  sport: Sport,
  score: TeamScore | undefined,
): boolean {
  if (sport !== "mlb" && sport !== "nhl" && sport !== "soccer" && sport !== "nba") return false;
  if (!score) return true;
  if (score.status === "scheduled") return true;
  if (score.status !== "live") return false;
  if (sport === "mlb") {
    return (score.inning ?? 0) < MLB_HIT_CUTOFF_INNING;
  }
  const cutoff =
    sport === "soccer"
      ? SOCCER_HIT_CUTOFF_PERIOD
      : sport === "nba"
        ? NBA_HIT_CUTOFF_PERIOD
        : NHL_HIT_CUTOFF_PERIOD;
  return (score.period ?? 0) < cutoff;
}
