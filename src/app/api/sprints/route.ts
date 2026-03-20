import { NextResponse } from "next/server";
import { loadAllData, dbCreateSprint, dbDeleteSprint } from "@/lib/db";

export async function GET() {
  const data = loadAllData();
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const { id, name, createdAt } = await req.json();
  dbCreateSprint(id, name, createdAt);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { id } = await req.json();
  dbDeleteSprint(id);
  return NextResponse.json({ ok: true });
}
