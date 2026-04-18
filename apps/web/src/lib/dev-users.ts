export type DevUser = {
  id: string;
  handle: string;
};

export type UserState = {
  balance: number;
  createdAt: string;
};

export type Tier = "Basement" | "Ground" | "Main Floor" | "Penthouse";

export const DEV_USERS: DevUser[] = [
  { id: "alice", handle: "Alice" },
  { id: "bob", handle: "Bob" },
  { id: "carl", handle: "Carl" },
  { id: "dina", handle: "Dina" },
  { id: "eli", handle: "Eli" },
];

export const DEFAULT_BALANCE = 100;

export function getTier(balance: number): Tier {
  if (balance < 10) return "Basement";
  if (balance < 100) return "Ground";
  if (balance < 2000) return "Main Floor";
  return "Penthouse";
}

export function getAvailableStakes(balance: number): number[] {
  if (balance < 10) return [1];
  if (balance < 100) return [1, 2];
  if (balance < 2000) return [1, 2, 5, 10];
  return [1, 2, 5, 10, 25];
}
