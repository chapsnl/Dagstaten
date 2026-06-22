import { NextRequest, NextResponse } from "next/server";
import { updateSettings } from "@/lib/repo/meta";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await updateSettings(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
