// Basic Auth gate for the whole app — single admin user, no sessions/DB needed.
// Next.js 16 renamed `middleware.ts` to `proxy.ts` (same mechanism, new name/export).
// Skipped in local dev (NODE_ENV !== "production") so `next dev` stays frictionless;
// Vercel sets NODE_ENV=production for both Preview and Production builds, so both are
// gated there. If ADMIN_PASSWORD isn't configured in production, fail closed (deny
// everything) rather than silently serving the app unprotected.
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { timingSafeEqual } from "crypto";

const REALM = 'Basic realm="ai-industry-map"';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function unauthorized(message: string): NextResponse {
  return new NextResponse(message, { status: 401, headers: { "WWW-Authenticate": REALM } });
}

export function proxy(request: NextRequest): NextResponse {
  if (process.env.NODE_ENV !== "production") return NextResponse.next();

  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) {
    return unauthorized("Admin login is not configured — set ADMIN_PASSWORD in the environment.");
  }
  const expectedUsername = process.env.ADMIN_USERNAME?.trim() || "admin";

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    const decoded = Buffer.from(auth.slice("Basic ".length), "base64").toString("utf-8");
    const sep = decoded.indexOf(":");
    const user = sep === -1 ? decoded : decoded.slice(0, sep);
    const pass = sep === -1 ? "" : decoded.slice(sep + 1);
    if (safeEqual(user, expectedUsername) && safeEqual(pass, expectedPassword)) {
      return NextResponse.next();
    }
  }
  return unauthorized("Authentication required.");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
