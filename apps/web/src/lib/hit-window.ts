import type { Sport } from "./sport";
import type { TeamScore } from "./settlement";

export const MLB_HIT_CUTOFF_INNING = 4;

export function isTeamHitEligible(
  sport: Sport,
  score: TeamScore | undefined,
): boolean {
  if (sport !== "mlb") return false;
  if (!score) return true;
  if (score.status === "scheduled") return true;
  if (score.status === "live" && (score.inning ?? 0) < MLB_HIT_CUTOFF_INNING) {
    return true;
  }
  return false;
}
