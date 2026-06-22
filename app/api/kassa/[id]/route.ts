import { NextRequest, NextResponse } from "next/server";
import { deactivateKassa, renameKassa } from "@/lib/repo/meta";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name } = await req.json();
  await renameKassa(Number(id), name);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await deactivateKassa(Number(id));
  return NextResponse.json({ ok: true });
}
