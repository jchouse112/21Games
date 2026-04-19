import { NextResponse } from "next/server";
import { fetchMlbSchedule } from "@/lib/mlb";
import { extractRunsMap, type TeamScore } from "@/lib/settlement";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  try {
    const schedule = await fetchMlbSchedule(date);
    const map = extractRunsMap(schedule);
    const scores: Record<number, TeamScore> = {};
    for (const [teamId, score] of map.entries()) {
      scores[teamId] = score;
    }
    return NextResponse.json({
      date,
      scores,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "fetch failed" },
      { status: 502 },
    );
  }
}
