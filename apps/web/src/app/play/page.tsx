import { getTodaySlate, type Slate } from "@/lib/slate";
import { BetForm } from "./_bet-form";
import { OpenBetsPill } from "./_open-bets-pill";

export default async function PlayPage() {
  let slate: Slate | null = null;
  try {
    slate = await getTodaySlate();
  } catch (error) {
    console.error("Failed to load today's slate", error);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <OpenBetsPill />
      <BetForm slate={slate} />
    </main>
  );
}
