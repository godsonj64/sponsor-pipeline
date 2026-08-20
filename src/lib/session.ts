/**
 * Single-user password gate.
 *
 * The app edits a personal job-search pipeline, so a public deployment must not
 * be world-writable. One shared password (SPONSOR_PASSWORD) unlocks it, and the
 * session is an HMAC-signed cookie — no user table, no third-party auth.
 *
 * Uses Web Crypto rather than node:crypto so the same code runs in the Edge
 * middleware and in Node route handlers.
 */
export const COOKIE = "sponsor_session";
const MAX_AGE = 60 * 60 * 24 * 14; // 14 days

/** Locking is on whenever a password is configured; local dev stays open. */
export const authRequired = () => Boolean(process.env.SPONSOR_PASSWORD);

function secret(): string {
  const s = process.env.SESSION_SECRET || process.env.SPONSOR_PASSWORD || "";
  if (!s) throw new Error("SESSION_SECRET or SPONSOR_PASSWORD must be set to sign sessions");
  return s;
}

const enc = new TextEncoder();

const b64url = (bytes: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

async function hmac(payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Length-independent comparison, so a wrong guess leaks no timing signal. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function issueToken(): Promise<string> {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${await hmac(exp)}`;
}

export async function tokenValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig) return false;
  if (!safeEqual(sig, await hmac(exp))) return false;
  return Number(exp) > Date.now();
}

export async function passwordValid(candidate: unknown): Promise<boolean> {
  const expected = process.env.SPONSOR_PASSWORD;
  if (!expected) return true; // no password configured: nothing to check
  if (typeof candidate !== "string" || !candidate) return false;
  // Compare digests so the comparison is fixed-length regardless of input.
  return safeEqual(await hmac(candidate), await hmac(expected));
}

export const cookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE,
};
