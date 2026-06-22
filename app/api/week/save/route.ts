import { NextRequest, NextResponse } from "next/server";
import { saveWeekExpenses, saveWeekDeposit } from "@/lib/repo/week";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { isoYear, isoWeek, expenses, actualDeposit, depositNote } = body as {
      isoYear: number;
      isoWeek: number;
      expenses: { description: string; amount: number }[];
      actualDeposit: number | null;
      depositNote: string | null;
    };
    if (!isoYear || !isoWeek) {
      return NextResponse.json({ error: "isoYear en isoWeek zijn verplicht" }, { status: 400 });
    }
    await saveWeekExpenses(isoYear, isoWeek, expenses || []);
    await saveWeekDeposit(isoYear, isoWeek, actualDeposit ?? null, depositNote ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
