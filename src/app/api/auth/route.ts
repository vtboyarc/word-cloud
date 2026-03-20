import { NextResponse } from "next/server";
import { verifyPassword, revokeToken, isValidToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { password } = await req.json();
  const token = verifyPassword(password);
  if (!token) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }
  return NextResponse.json({ token });
}

export async function DELETE(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token && isValidToken(token)) {
    revokeToken(token);
  }
  return NextResponse.json({ ok: true });
}
