import { NextResponse } from "next/server";
import { COOKIE, cookieOptions, issueToken, passwordValid } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { n: number; until: number }>();

/** Crude but sufficient: five wrong guesses per IP per fifteen minutes. */
function throttled(req: Request): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now > rec.until) {
    attempts.set(ip, { n: 1, until: now + 15 * 60_000 });
    return false;
  }
  rec.n += 1;
  return rec.n > 5;
}

export async function POST(req: Request) {
  if (throttled(req)) {
    return NextResponse.json({ error: "Too many attempts. Try again later." }, { status: 429 });
  }

  let body: { password?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Malformed request body." }, { status: 400 });
  }

  if (!(await passwordValid(body.password))) {
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, await issueToken(), cookieOptions);
  return res;
}

/** Sign out. */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
