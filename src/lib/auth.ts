import crypto from "crypto";

const TOKEN_MAX_AGE_MS = 1000 * 60 * 60 * 12;

function normalizePassword(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

const PASSWORD = normalizePassword(
  process.env.ADMIN_PASSWORD ?? process.env.APP_PASSWORD ?? "bigcountry"
);

function getSigningKey(): string {
  return `retro-cloud:${PASSWORD}`;
}

function createToken(): string {
  const issuedAt = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

function hasValidSignature(payload: string, signature: string): boolean {
  const expected = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("hex");

  if (signature.length !== expected.length) return false;

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyPassword(password: string): string | null {
  if (normalizePassword(password) !== PASSWORD) return null;
  return createToken();
}

export function isValidToken(token: string | null | undefined): boolean {
  if (!token) return false;

  const [issuedAtRaw, nonce, signature] = token.split(".");
  if (!issuedAtRaw || !nonce || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  if (!Number.isFinite(issuedAt)) return false;
  if (Date.now() - issuedAt > TOKEN_MAX_AGE_MS) return false;

  return hasValidSignature(`${issuedAtRaw}.${nonce}`, signature);
}

export function revokeToken(_token: string): void {}

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
