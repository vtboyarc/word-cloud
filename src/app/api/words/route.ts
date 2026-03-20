import { NextResponse } from "next/server";
import { dbAddWord, dbRemoveWord } from "@/lib/db";

export async function POST(req: Request) {
  const { sprintId, word, timestamp } = await req.json();
  dbAddWord(sprintId, word, timestamp);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const { sprintId, index } = await req.json();
  dbRemoveWord(sprintId, index);
  return NextResponse.json({ ok: true });
}
