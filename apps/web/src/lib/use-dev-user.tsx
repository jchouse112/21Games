"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  DEV_USERS,
  DEFAULT_BALANCE,
  type DevUser,
  type UserState,
} from "./dev-users";
import { computeRefill } from "./refill";
import { getTodayIsoDateEt } from "./slate";

const CURRENT_USER_KEY = "play21.currentUser";
const USER_STATE_PREFIX = "play21.user.";
const DEFAULT_USER_ID = DEV_USERS[0]!.id;
const REFILL_CHECK_MS = 60_000;
const SERVER_STATE: UserState = Object.freeze({
  balance: DEFAULT_BALANCE,
  createdAt: "1970-01-01T00:00:00.000Z",
}) as UserState;

type ContextValue = {
  user: DevUser;
  state: UserState;
  setUserId: (id: string) => void;
  updateBalance: (next: number) => void;
  resetUser: () => void;
};

const Ctx = createContext<ContextValue | null>(null);

function freshState(): UserState {
  return { balance: DEFAULT_BALANCE, createdAt: new Date().toISOString() };
}

function readUserId(): string {
  if (typeof window === "undefined") return DEFAULT_USER_ID;
  const stored = window.localStorage.getItem(CURRENT_USER_KEY);
  return stored && DEV_USERS.some((u) => u.id === stored) ? stored : DEFAULT_USER_ID;
}

function readState(userId: string): UserState {
  if (typeof window === "undefined") return SERVER_STATE;
  const raw = window.localStorage.getItem(USER_STATE_PREFIX + userId);
  if (!raw) return freshState();
  try {
    const parsed = JSON.parse(raw) as Partial<UserState>;
    return {
      balance: typeof parsed.balance === "number" ? parsed.balance : DEFAULT_BALANCE,
      createdAt: parsed.createdAt ?? new Date().toISOString(),
      lastRefillEtDate:
        typeof parsed.lastRefillEtDate === "string"
          ? parsed.lastRefillEtDate
          : undefined,
    };
  } catch {
    return freshState();
  }
}

function writeState(userId: string, state: UserState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    USER_STATE_PREFIX + userId,
    JSON.stringify(state),
  );
}

const listeners = new Set<() => void>();
let cachedUserId: string | null = null;
let cachedStateUserId: string | null = null;
let cachedState: UserState | null = null;
let refillIntervalId: ReturnType<typeof setInterval> | null = null;

function notify() {
  cachedUserId = null;
  cachedStateUserId = null;
  cachedState = null;
  for (const l of listeners) l();
}

function runRefillCheck() {
  if (typeof window === "undefined") return;
  const userId = readUserId();
  const current = readState(userId);
  const next = computeRefill(current, getTodayIsoDateEt());
  if (next) {
    writeState(userId, next);
    notify();
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (!e.key) return;
    if (e.key === CURRENT_USER_KEY || e.key.startsWith(USER_STATE_PREFIX)) {
      notify();
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
    if (refillIntervalId === null) {
      queueMicrotask(runRefillCheck);
      refillIntervalId = setInterval(runRefillCheck, REFILL_CHECK_MS);
    }
  }
  return () => {
    listeners.delete(listener);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
    if (listeners.size === 0 && refillIntervalId !== null) {
      clearInterval(refillIntervalId);
      refillIntervalId = null;
    }
  };
}

function getUserIdSnapshot(): string {
  if (cachedUserId === null) cachedUserId = readUserId();
  return cachedUserId;
}

function getUserIdServerSnapshot(): string {
  return DEFAULT_USER_ID;
}

function getStateSnapshot(): UserState {
  const userId = getUserIdSnapshot();
  if (cachedState === null || cachedStateUserId !== userId) {
    cachedState = readState(userId);
    cachedStateUserId = userId;
  }
  return cachedState;
}

function getStateServerSnapshot(): UserState {
  return SERVER_STATE;
}

export function DevUserProvider({ children }: { children: ReactNode }) {
  const userId = useSyncExternalStore(
    subscribe,
    getUserIdSnapshot,
    getUserIdServerSnapshot,
  );
  const state = useSyncExternalStore(
    subscribe,
    getStateSnapshot,
    getStateServerSnapshot,
  );

  const setUserId = useCallback((id: string) => {
    if (!DEV_USERS.some((u) => u.id === id)) return;
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CURRENT_USER_KEY, id);
    notify();
  }, []);

  const updateBalance = useCallback((next: number) => {
    const currentId = getUserIdSnapshot();
    const prev = readState(currentId);
    const clamped = Math.max(0, Math.round(next));
    writeState(currentId, { ...prev, balance: clamped });
    notify();
  }, []);

  const resetUser = useCallback(() => {
    writeState(getUserIdSnapshot(), freshState());
    notify();
  }, []);

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
