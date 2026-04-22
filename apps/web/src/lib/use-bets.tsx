"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  BETS_KEY_PREFIX,
  betsStorageKey,
  type Bet,
  type BetHit,
  type BetTeam,
} from "./bets";
import { committedRatio, HIT_COST_FRAC, MAX_TEAMS } from "./odds";
import { DEFAULT_SPORT, isSport } from "./sport";
import { useDevUser } from "./use-dev-user";

export type AddTeamResult =
  | { ok: true; bet: Bet; hitCost: number }
  | { ok: false; reason: string };

type ContextValue = {
  bets: Bet[];
  openBets: Bet[];
  settledBets: Bet[];
  addBet: (bet: Bet) => void;
  removeBet: (id: string) => void;
  updateBet: (id: string, patch: Partial<Bet>) => void;
  addTeamToBet: (id: string, team: BetTeam, balance: number) => AddTeamResult;
  clearBets: () => void;
};

const Ctx = createContext<ContextValue | null>(null);
const EMPTY_BETS: readonly Bet[] = Object.freeze([]);

function migrateBet(raw: unknown): Bet | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Partial<Bet> & { sport?: unknown };
  if (typeof b.id !== "string") return null;
  const stake = typeof b.stake === "number" ? b.stake : 0;
  const hits: BetHit[] = Array.isArray(b.hits) ? (b.hits as BetHit[]) : [];
  const baseStake =
    typeof b.baseStake === "number" && b.baseStake > 0
      ? b.baseStake
      : stake / (1 + 0.25 * hits.length);
  return {
    ...(b as Bet),
    sport: isSport(b.sport) ? b.sport : DEFAULT_SPORT,
    baseStake,
    hits,
  };
}

function loadBets(userId: string): Bet[] {
  if (typeof window === "undefined") return EMPTY_BETS as Bet[];
  const raw = window.localStorage.getItem(betsStorageKey(userId));
  if (!raw) return EMPTY_BETS as Bet[];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY_BETS as Bet[];
    const migrated: Bet[] = [];
    for (const entry of parsed) {
      const bet = migrateBet(entry);
      if (bet) migrated.push(bet);
    }
    return migrated;
  } catch {
    return EMPTY_BETS as Bet[];
  }
}

function saveBets(userId: string, bets: Bet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(betsStorageKey(userId), JSON.stringify(bets));
}

const listeners = new Set<() => void>();
const cachedByUser = new Map<string, Bet[]>();

function notify(userId?: string) {
  if (userId) cachedByUser.delete(userId);
  else cachedByUser.clear();
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key.startsWith(BETS_KEY_PREFIX)) notify();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

function getSnapshotFor(userId: string): Bet[] {
  const cached = cachedByUser.get(userId);
  if (cached) return cached;
  const fresh = loadBets(userId);
  cachedByUser.set(userId, fresh);
  return fresh;
}

function getServerSnapshot(): Bet[] {
  return EMPTY_BETS as Bet[];
}

export function BetsProvider({ children }: { children: ReactNode }) {
  const { user } = useDevUser();
  const userId = user.id;
  const getSnapshot = useCallback(() => getSnapshotFor(userId), [userId]);
  const bets = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addBet = useCallback(
    (bet: Bet) => {
      const next = [bet, ...getSnapshotFor(userId)];
      saveBets(userId, next);
      notify(userId);
    },
    [userId],
  );

  const removeBet = useCallback(
    (id: string) => {
      const next = getSnapshotFor(userId).filter((b) => b.id !== id);
      saveBets(userId, next);
      notify(userId);
    },
    [userId],
  );

  const updateBet = useCallback(
    (id: string, patch: Partial<Bet>) => {
      const next = getSnapshotFor(userId).map((b) =>
        b.id === id ? { ...b, ...patch } : b,
      );
      saveBets(userId, next);
      notify(userId);
    },
    [userId],
  );

  const addTeamToBet = useCallback(
    (id: string, team: BetTeam, balance: number): AddTeamResult => {
      const current = getSnapshotFor(userId);
      const bet = current.find((b) => b.id === id);
      if (!bet) return { ok: false, reason: "bet-not-found" };
      if (bet.status !== "open") return { ok: false, reason: "bet-closed" };
      if (bet.teams.length >= MAX_TEAMS) return { ok: false, reason: "max-teams" };
      if (bet.teams.some((t) => t.id === team.id)) {
        return { ok: false, reason: "duplicate-team" };
      }
      const hitCost = bet.baseStake * HIT_COST_FRAC;
      if (balance < hitCost) return { ok: false, reason: "insufficient-balance" };

      const nextHits = [...bet.hits, { at: new Date().toISOString(), team }];
      const nextTeams = [...bet.teams, team];
      const nextStake = bet.baseStake * committedRatio(nextHits.length);
      const updated: Bet = {
        ...bet,
        teams: nextTeams,
        hits: nextHits,
        stake: nextStake,
      };
      const next = current.map((b) => (b.id === id ? updated : b));
      saveBets(userId, next);
      notify(userId);
      return { ok: true, bet: updated, hitCost };
    },
    [userId],
  );

  const clearBets = useCallback(() => {
    saveBets(userId, []);
    notify(userId);
  }, [userId]);

  const { openBets, settledBets } = useMemo(
    () => ({
      openBets: bets.filter((b) => b.status === "open"),
      settledBets: bets.filter((b) => b.status === "settled"),
    }),
    [bets],
  );

  return (
    <Ctx.Provider
      value={{
        bets,
        openBets,
        settledBets,
        addBet,
        removeBet,
        updateBet,
        addTeamToBet,
        clearBets,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBets() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBets must be used inside BetsProvider");
  return ctx;
}
