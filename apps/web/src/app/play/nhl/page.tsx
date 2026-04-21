import { getTodayNhlSlate, type NhlSlate } from "@/lib/slate";
import { BetForm } from "../_bet-form";
import { OpenBetsPill } from "../_open-bets-pill";

export default async function PlayNhlPage() {
  let slate: NhlSlate | null = null;
  try {
    slate = await getTodayNhlSlate();
  } catch (error) {
    console.error("Failed to load today's NHL slate", error);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <OpenBetsPill />
      <BetForm sport="nhl" slate={slate} />
    </main>
  );
}
