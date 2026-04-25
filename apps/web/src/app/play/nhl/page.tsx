import {
  getSlateDateEt,
  getTodayNhlSlate,
  normalizeSlateDay,
  type NhlSlate,
} from "@/lib/slate";
import { BetForm } from "../_bet-form";
import { OpenBetsPill } from "../_open-bets-pill";

export default async function PlayNhlPage({
  searchParams,
}: {
  searchParams: Promise<{ day?: string | string[] }>;
}) {
  const params = await searchParams;
  const day = normalizeSlateDay(params.day);
  const date = getSlateDateEt(day);
  let slate: NhlSlate | null = null;
  try {
    slate = await getTodayNhlSlate(date);
  } catch (error) {
    console.error(`Failed to load NHL slate for ${date}`, error);
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <OpenBetsPill />
      <BetForm key={`nhl-${date}`} sport="nhl" slate={slate} day={day} />
    </main>
  );
}
