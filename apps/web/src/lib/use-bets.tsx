"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  betsStorageKey,
  type Bet,
} from "./bets";
import { useDevUser } from "./use-dev-user";

type ContextValue = {
  bets: Bet[];
  openBets: Bet[];
  addBet: (bet: Bet) => void;
  removeBet: (id: string) => void;
  clearBets: () => void;
};

const Ctx = createContext<ContextValue | null>(null);

function loadBets(userId: string): Bet[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(betsStorageKey(userId));
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Bet[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBets(userId: string, bets: Bet[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(betsStorageKey(userId), JSON.stringify(bets));
}

export function BetsProvider({ children }: { children: ReactNode }) {
  const { user } = useDevUser();
  const userId = user.id;
  const [bets, setBets] = useState<Bet[]>([]);

  useEffect(() => {
    setBets(loadBets(userId));
  }, [userId]);

  const addBet = useCallback(
    (bet: Bet) => {
      setBets((prev) => {
        const next = [bet, ...prev];
        saveBets(userId, next);
        return next;
      });
    },
    [userId],
  );

  const removeBet = useCallback(
    (id: string) => {
      setBets((prev) => {
        const next = prev.filter((b) => b.id !== id);
        saveBets(userId, next);
        return next;
      });
    },
    [userId],
  );

  const clearBets = useCallback(() => {
    setBets([]);
    saveBets(userId, []);
  }, [userId]);

  const openBets = bets.filter((b) => b.status === "open");

  return (
    <Ctx.Provider value={{ bets, openBets, addBet, removeBet, clearBets }}>
      {children}
    </Ctx.Provider>
  );
}

export function useBets() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBets must be used inside BetsProvider");
  return ctx;
}
