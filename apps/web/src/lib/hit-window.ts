import type { Bet } from "./bets";
import type { RunsMap } from "./settlement";

export const MLB_HIT_WINDOW_FALLBACK_MS = 55 * 60 * 1000;

export function computeHitWindowCloseAtIso(
  sport: Bet["sport"],
  teamStartsAtIsos: Array<string | undefined>,
): string | undefined {
  if (sport !== "mlb") return undefined;
  const stamps = teamStartsAtIsos
    .map((s) => (s ? Date.parse(s) : NaN))
    .filter((n) => !Number.isNaN(n));
  if (stamps.length === 0) return undefined;
  const earliest = Math.min(...stamps);
  return new Date(earliest + MLB_HIT_WINDOW_FALLBACK_MS).toISOString();
}

export function isHitWindowClosed(
  bet: Bet,
  runs: RunsMap,
  now: number = Date.now(),
): boolean {
  if (bet.sport !== "mlb") return true;

  for (const t of bet.teams) {
    const s = runs.get(t.id);
    if (!s) continue;
    if (s.status === "voided" || s.status === "final") return true;
    if (s.status === "live" && (s.inning ?? 0) >= 4) return true;
  }

  if (bet.hitWindowCloseAtIso) {
    const close = Date.parse(bet.hitWindowCloseAtIso);
    if (!Number.isNaN(close) && now >= close) return true;
  }

  return false;
}
