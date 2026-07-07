import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";

// Next.js 16 renamed `middleware` to `proxy` (same mechanism, new name/file).
export async function proxy(request: NextRequest) {
  const validPassword = process.env.AUTH_PASSWORD;
  if (!validPassword) {
    console.error("AUTH_PASSWORD not configured");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  if (request.nextUrl.pathname === "/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await isValidSessionToken(token, validPassword)) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico).*)"],
};
