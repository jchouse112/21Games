import type { GameStatus } from "./settlement";

export const PICK_LOCK_LEAD_MS = 10 * 60 * 1000;

export type PickLockInput = {
  startsAtIso: string;
  liveStatus: GameStatus | undefined;
  now?: number;
};

export function isPickLocked({
  startsAtIso,
  liveStatus,
  now,
}: PickLockInput): boolean {
  if (liveStatus && liveStatus !== "scheduled") return true;
  const start = Date.parse(startsAtIso);
  if (Number.isNaN(start)) return false;
  return (now ?? Date.now()) + PICK_LOCK_LEAD_MS >= start;
}

export function msUntilPickLock({
  startsAtIso,
  liveStatus,
  now,
}: PickLockInput): number | null {
  if (liveStatus && liveStatus !== "scheduled") return null;
  const start = Date.parse(startsAtIso);
  if (Number.isNaN(start)) return null;
  const remaining = start - PICK_LOCK_LEAD_MS - (now ?? Date.now());
  return remaining > 0 ? remaining : null;
}
