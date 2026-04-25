"use client";

import { useCallback, useEffect, useState } from "react";
import type { RunsMap, TeamScore } from "./settlement";
import { scoreKey, type Sport } from "./sport";

const POLL_MS = 60_000;

type ScoresPayload = {
  date: string;
  scores: Record<string, TeamScore>;
  fetchedAt: string;
};

export type ScoreTarget = { sport: Sport; date: string };

function endpointFor(sport: Sport, date: string): string {
  if (sport === "nhl") return `/api/scores/nhl?date=${date}`;
  if (sport === "soccer") return `/api/scores/soccer?date=${date}`;
  if (sport === "nba") return `/api/scores/nba?date=${date}`;
  return `/api/scores?date=${date}`;
}

function dedupeTargets(targets: ScoreTarget[]): ScoreTarget[] {
  const seen = new Set<string>();
  const out: ScoreTarget[] = [];
  for (const t of targets) {
    const k = scoreKey(t.sport, t.date);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

export function useLiveScores(targets: ScoreTarget[]): {
  runsBySportDate: Map<string, RunsMap>;
  lastUpdated: string | null;
  refresh: () => void;
} {
  const [runsBySportDate, setRunsBySportDate] = useState<Map<string, RunsMap>>(
    () => new Map(),
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const targetsKey = targets
    .map((t) => scoreKey(t.sport, t.date))
    .sort()
    .join(",");

  useEffect(() => {
    const unique = dedupeTargets(targets);
    if (unique.length === 0) return;
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.all(
        unique.map(async ({ sport, date }) => {
          const key = scoreKey(sport, date);
          try {
            const res = await fetch(endpointFor(sport, date), {
              cache: "no-store",
            });
            if (!res.ok) return [key, null] as const;
            const json = (await res.json()) as ScoresPayload;
            const map: RunsMap = new Map();
            for (const [k, v] of Object.entries(json.scores)) {
              map.set(Number(k), v);
            }
            return [key, map] as const;
          } catch {
            return [key, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setRunsBySportDate((prev) => {
        const next = new Map(prev);
        for (const [key, map] of results) {
          if (map) next.set(key, map);
        }
        return next;
      });
      setLastUpdated(new Date().toISOString());
    }

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetsKey, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { runsBySportDate, lastUpdated, refresh };
}
