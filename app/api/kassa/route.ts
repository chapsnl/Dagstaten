import { NextRequest, NextResponse } from "next/server";
import { addKassa } from "@/lib/repo/meta";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { businessId, code, name } = await req.json();
    if (!businessId || !code || !name) {
      return NextResponse.json({ error: "businessId, code en name zijn verplicht" }, { status: 400 });
    }
    const id = await addKassa(businessId, code, name);
    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Toevoegen mislukt" }, { status: 500 });
  }
}
