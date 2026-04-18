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
  DEV_USERS,
  DEFAULT_BALANCE,
  type DevUser,
  type UserState,
} from "./dev-users";

const CURRENT_USER_KEY = "play21.currentUser";
const USER_STATE_PREFIX = "play21.user.";

type ContextValue = {
  user: DevUser;
  state: UserState;
  setUserId: (id: string) => void;
  updateBalance: (next: number) => void;
  resetUser: () => void;
};

const Ctx = createContext<ContextValue | null>(null);

function defaultState(): UserState {
  return { balance: DEFAULT_BALANCE, createdAt: new Date().toISOString() };
}

function loadState(userId: string): UserState {
  if (typeof window === "undefined") return defaultState();
  const raw = window.localStorage.getItem(USER_STATE_PREFIX + userId);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<UserState>;
    return {
      balance: typeof parsed.balance === "number" ? parsed.balance : DEFAULT_BALANCE,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
    };
  } catch {
    return defaultState();
  }
}

function saveState(userId: string, state: UserState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    USER_STATE_PREFIX + userId,
    JSON.stringify(state),
  );
}

export function DevUserProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<string>(DEV_USERS[0]!.id);
  const [state, setState] = useState<UserState>(defaultState());

  useEffect(() => {
    const stored = window.localStorage.getItem(CURRENT_USER_KEY);
    const initial =
      stored && DEV_USERS.find((u) => u.id === stored)
        ? stored
        : DEV_USERS[0]!.id;
    setUserIdState(initial);
    setState(loadState(initial));
  }, []);

  const setUserId = useCallback((id: string) => {
    if (!DEV_USERS.find((u) => u.id === id)) return;
    window.localStorage.setItem(CURRENT_USER_KEY, id);
    setUserIdState(id);
    setState(loadState(id));
  }, []);

  const updateBalance = useCallback(
    (next: number) => {
      setState((prev) => {
        const clamped = Math.max(0, Math.round(next));
        const nextState = { ...prev, balance: clamped };
        saveState(userId, nextState);
        return nextState;
      });
    },
    [userId],
  );

  const resetUser = useCallback(() => {
    const nextState = defaultState();
    setState(nextState);
    saveState(userId, nextState);
  }, [userId]);

  const user = DEV_USERS.find((u) => u.id === userId) ?? DEV_USERS[0]!;

  return (
    <Ctx.Provider value={{ user, state, setUserId, updateBalance, resetUser }}>
      {children}
    </Ctx.Provider>
  );
}

export function useDevUser() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useDevUser must be used inside DevUserProvider");
  return ctx;
}
