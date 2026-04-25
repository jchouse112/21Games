import {
  getSlateDateEt,
  getTodayNbaSlate,
  normalizeSlateDay,
  type NbaSlate,
} from "@/lib/slate";
import { BetForm } from "../_bet-form";
import { OpenBetsPill } from "../_open-bets-pill";

export default async function PlayNbaPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const params = await searchParams;
  const day = normalizeSlateDay(params.day);
  const date = getSlateDateEt(day);
  let slate: NbaSlate | null = null;
  try {
    slate = await getTodayNbaSlate(date);
  } catch (error) {
    console.error(`Failed to load NBA slate for ${date}`, error);
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <OpenBetsPill />
      <BetForm key={`nba-${date}`} sport="nba" slate={slate} day={day} />
    </main>
  );
}