import { NextRequest, NextResponse } from "next/server";
import { saveDayEntries, DayEntryInput } from "@/lib/repo/dailyEntry";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { date, entries } = body as { date: string; entries: DayEntryInput[] };
    if (!date || !Array.isArray(entries)) {
      return NextResponse.json({ error: "date en entries zijn verplicht" }, { status: 400 });
    }
    await saveDayEntries(date, entries);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
