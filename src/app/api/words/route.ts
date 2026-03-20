import { NextResponse } from "next/server";
import { dbAddWord, dbRemoveWord } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

export async function POST(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { sprintId, word, timestamp } = await req.json();
  await dbAddWord(sprintId, word, timestamp);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const denied = requireAuth(req);
  if (denied) return denied;
  const { sprintId, index } = await req.json();
  await dbRemoveWord(sprintId, index);
  return NextResponse.json({ ok: true });
}
