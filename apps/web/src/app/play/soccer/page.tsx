import {
  getSlateDateEt,
  getTodaySoccerSlate,
  normalizeSlateDay,
  type SoccerSlate,
} from "@/lib/slate";
import { BetForm } from "../_bet-form";
import { OpenBetsPill } from "../_open-bets-pill";

export default async function PlaySoccerPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const params = await searchParams;
  const day = normalizeSlateDay(params.day);
  const date = getSlateDateEt(day);
  let slate: SoccerSlate | null = null;
  try {
    slate = await getTodaySoccerSlate(date);
  } catch (error) {
    console.error(`Failed to load MLS slate for ${date}`, error);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <OpenBetsPill />
      <BetForm key={`soccer-${date}`} sport="soccer" slate={slate} day={day} />
    </main>
  );
}
