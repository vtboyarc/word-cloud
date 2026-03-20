export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { loadAllData, dbCreateSprint, dbDeleteSprint } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const data = await loadAllData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { id, name, createdAt } = await req.json();
  await dbCreateSprint(id, name, createdAt);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { id } = await req.json();
  await dbDeleteSprint(id);
  return NextResponse.json({ ok: true });
}
