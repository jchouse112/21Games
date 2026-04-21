"use client";

import { useSyncExternalStore } from "react";

const DEFAULT_TICK_MS = 30_000;

type ClockStore = {
  now: number;
  listeners: Set<() => void>;
  intervalId: ReturnType<typeof setInterval> | null;
};

const stores = new Map<number, ClockStore>();

function getStore(tickMs: number): ClockStore {
  let s = stores.get(tickMs);
  if (!s) {
    s = { now: 0, listeners: new Set(), intervalId: null };
    stores.set(tickMs, s);
  }
  return s;
}

function subscribe(tickMs: number, cb: () => void): () => void {
  const s = getStore(tickMs);
  s.listeners.add(cb);
  if (s.intervalId === null && typeof window !== "undefined") {
    s.now = Date.now();
    s.intervalId = setInterval(() => {
      s.now = Date.now();
      s.listeners.forEach((l) => l());
    }, tickMs);
  }
  return () => {
    s.listeners.delete(cb);
    if (s.listeners.size === 0 && s.intervalId !== null) {
      clearInterval(s.intervalId);
      s.intervalId = null;
    }
  };
}

function getSnapshot(tickMs: number): number {
  const s = getStore(tickMs);
  return s.now || (s.now = Date.now());
}

function getServerSnapshot(): number {
  return 0;
}

export function useClock(tickMs: number = DEFAULT_TICK_MS): number {
  return useSyncExternalStore(
    (cb) => subscribe(tickMs, cb),
    () => getSnapshot(tickMs),
    getServerSnapshot,
  );
}
