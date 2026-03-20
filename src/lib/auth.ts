import crypto from "crypto";
import { dbAddToken, dbHasToken, dbRemoveToken } from "./db";

const PASSWORD = process.env.APP_PASSWORD ?? "bigcountry";

export function verifyPassword(password: string): string | null {
  if (password !== PASSWORD) return null;
  const token = crypto.randomBytes(32).toString("hex");
  dbAddToken(token);
  return token;
}

export function isValidToken(token: string | null | undefined): boolean {
  return !!token && dbHasToken(token);
}

export function revokeToken(token: string): void {
  dbRemoveToken(token);
}

export function requireAuth(req: Request): Response | null {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!isValidToken(token)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}
