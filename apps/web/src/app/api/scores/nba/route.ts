import { NextResponse } from "next/server";
import { fetchNbaScoreboard, fetchNbaSummary } from "@/lib/nba";
import { getTodayNbaSlate } from "@/lib/slate";
import {
  classifyNbaStatus,
  extractNbaThreePointersMap,
  type TeamScore,
} from "@/lib/settlement";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  try {
    const [scoreboard, slate] = await Promise.all([
      fetchNbaScoreboard(date),
      getTodayNbaSlate(date),
    ]);
    const scores = new Map<number, TeamScore>();

    for (const g of slate.games) {
      const event = scoreboard.events?.find((e) =>
        e.competitions?.some((c) => String(c.id ?? e.id) === g.id),
      );
      const competition = event?.competitions?.[0];
      const status = classifyNbaStatus(competition?.status ?? event?.status);
      const common = {
        gamePk: Number(g.id),
        runs: 0,
        status,
        inning: null,
        inningOrdinal: null,
        inningHalf: null,
        period: competition?.status?.period ?? event?.status?.period ?? null,
        periodClock:
          competition?.status?.displayClock ?? event?.status?.displayClock ?? null,
      };
      scores.set(g.away.id, { teamId: g.away.id, ...common });
      scores.set(g.home.id, { teamId: g.home.id, ...common });
      for (const player of g.players) {
        scores.set(player.id, { teamId: player.id, ...common });
      }
    }

    const summaries = await Promise.all(
      (scoreboard.events ?? []).map((event) =>
        fetchNbaSummary(event.id).catch(() => null),
      ),
    );
    for (const summary of summaries) {
      if (!summary) continue;
      for (const [playerId, score] of extractNbaThreePointersMap(summary)) {
        scores.set(playerId, score);
      }
    }

    const payload: Record<number, TeamScore> = {};
    for (const [id, score] of scores.entries()) payload[id] = score;
    return NextResponse.json({
      date,
      scores: payload,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "fetch failed" },
      { status: 502 },
    );
  }
}