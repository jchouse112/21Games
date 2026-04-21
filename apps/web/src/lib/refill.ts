import { MIN_STAKE, REFILL_AMOUNT, type UserState } from "./dev-users";

export function computeRefill(
  state: UserState,
  todayEtDate: string,
): UserState | null {
  if (state.lastRefillEtDate === todayEtDate) return null;
  if (state.balance >= MIN_STAKE) return null;
  return {
    ...state,
    balance: state.balance + REFILL_AMOUNT,
    lastRefillEtDate: todayEtDate,
  };
}
