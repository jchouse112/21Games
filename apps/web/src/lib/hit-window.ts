import type { Sport } from "./sport";
import type { TeamScore } from "./settlement";

export const MLB_HIT_CUTOFF_INNING = 4;
export const NHL_HIT_CUTOFF_PERIOD = 2;

export function isTeamHitEligible(
  sport: Sport,
  score: TeamScore | undefined,
): boolean {
  if (sport !== "mlb" && sport !== "nhl") return false;
  if (!score) return true;
  if (score.status === "scheduled") return true;
  if (score.status !== "live") return false;
  if (sport === "mlb") {
    return (score.inning ?? 0) < MLB_HIT_CUTOFF_INNING;
  }
  return (score.period ?? 0) < NHL_HIT_CUTOFF_PERIOD;
}
