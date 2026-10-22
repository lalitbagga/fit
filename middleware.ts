import { NextRequest, NextResponse } from "next/server";

// Public paths — never redirect these
const PUBLIC_PREFIXES = ["/login", "/api/auth", "/_next", "/favicon.ico"];

// OAuth callbacks always return to the canonical host, so sign-in must start there
const CANONICAL_URL = process.env.NEXTAUTH_URL?.trim();

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (process.env.VERCEL_ENV === "production" && CANONICAL_URL) {
    const canonical = new URL(CANONICAL_URL);
    if (req.nextUrl.host !== canonical.host) {
      const url = req.nextUrl.clone();
      url.protocol = canonical.protocol;
      url.host = canonical.host;
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
  }

  // Always let public paths through first — prevents any redirect loop
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // NextAuth v5 sets one of these two cookie names depending on HTTPS
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
