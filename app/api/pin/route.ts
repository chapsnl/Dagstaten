import { NextRequest, NextResponse } from "next/server";
import { addReservePinDevice } from "@/lib/repo/meta";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  await addReservePinDevice(name || "Reserve PIN");
  return NextResponse.json({ ok: true });
}
