import crypto from "crypto";

const PASSWORD = process.env.APP_PASSWORD ?? "bigcountry";

const tokens = new Set<string>();

export function verifyPassword(password: string): string | null {
  if (password !== PASSWORD) return null;
  const token = crypto.randomBytes(32).toString("hex");
  tokens.add(token);
  return token;
}

export function isValidToken(token: string | null | undefined): boolean {
  return !!token && tokens.has(token);
}

export function revokeToken(token: string): void {
  tokens.delete(token);
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
