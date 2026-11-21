// Household session: a signed cookie of the form "<expiresAtMs>.<hmac>".
// Uses Web Crypto so it works in both the proxy and server code.

export const SESSION_COOKIE = "mp_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 180; // ~6 months

const encoder = new TextEncoder();

async function hmac(value: string): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET must be set to at least 32 characters");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(sig).toString("base64url");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const expires = String(now + SESSION_MAX_AGE_SECONDS * 1000);
  return `${expires}.${await hmac(expires)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const [expires, sig] = token.split(".");
  if (!expires || !sig || !/^\d+$/.test(expires)) return false;
  if (Number(expires) < now) return false;
  return timingSafeEqual(sig, await hmac(expires));
}

export function passphraseMatches(input: string): boolean {
  const expected = process.env.HOUSEHOLD_PASSPHRASE;
  if (!expected) throw new Error("HOUSEHOLD_PASSPHRASE is not set");
  const norm = (s: string) => s.trim().toLowerCase();
  return timingSafeEqual(norm(input), norm(expected));
}
