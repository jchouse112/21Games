"use client";

import { useCallback, useEffect, useState } from "react";
import type { RunsMap, TeamScore } from "./settlement";

const POLL_MS = 60_000;

type ScoresPayload = {
  date: string;
  scores: Record<string, TeamScore>;
  fetchedAt: string;
};

export function useLiveScores(dates: string[]): {
  runsByDate: Map<string, RunsMap>;
  lastUpdated: string | null;
  refresh: () => void;
} {
  const [runsByDate, setRunsByDate] = useState<Map<string, RunsMap>>(
    () => new Map(),
  );
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const datesKey = dates.join("|");

  useEffect(() => {
    if (dates.length === 0) {
      setRunsByDate(new Map());
      return;
    }
    let cancelled = false;

    async function fetchAll() {
      const results = await Promise.all(
        dates.map(async (date) => {
          try {
            const res = await fetch(`/api/scores?date=${date}`, {
              cache: "no-store",
            });
            if (!res.ok) return [date, null] as const;
            const json = (await res.json()) as ScoresPayload;
            const map: RunsMap = new Map();
            for (const [k, v] of Object.entries(json.scores)) {
              map.set(Number(k), v);
            }
            return [date, map] as const;
          } catch {
            return [date, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setRunsByDate((prev) => {
        const next = new Map(prev);
        for (const [date, map] of results) {
          if (map) next.set(date, map);
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
  }, [datesKey, tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  return { runsByDate, lastUpdated, refresh };
}
