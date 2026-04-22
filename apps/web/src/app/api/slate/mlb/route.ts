import { NextResponse } from "next/server";
import { getTodaySlate } from "@/lib/slate";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid date" }, { status: 400 });
  }
  try {
    const slate = await getTodaySlate(date);
    return NextResponse.json({
      date: slate.date,
      games: slate.games.map((g) => ({
        id: g.id,
        startsAtIso: g.startsAtIso,
        away: { id: g.away.id, abbr: g.away.abbr, name: g.away.name },
        home: { id: g.home.id, abbr: g.home.abbr, name: g.home.name },
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "fetch failed" },
      { status: 502 },
    );
  }
}
