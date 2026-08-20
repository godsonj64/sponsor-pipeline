import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, authRequired, tokenValid } from "@/lib/session";

/** Everything is gated except the login screen itself and static assets. */
const OPEN = ["/login", "/api/auth", "/icon.svg", "/favicon.ico"];

export async function middleware(req: NextRequest) {
  if (!authRequired()) return NextResponse.next();

  const { pathname, search } = req.nextUrl;
  if (OPEN.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return NextResponse.next();

  if (await tokenValid(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  // API callers get a clean 401 rather than an HTML redirect.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = pathname === "/" ? "" : `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
