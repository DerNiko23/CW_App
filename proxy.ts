import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed `middleware` to `proxy` (same mechanism, new name/file).
export function proxy(request: NextRequest) {
  const validUser = process.env.AUTH_USERNAME;
  const validPassword = process.env.AUTH_PASSWORD;

  if (!validUser || !validPassword) {
    console.error("AUTH_USERNAME/AUTH_PASSWORD not configured");
    return new NextResponse("Server misconfigured", { status: 500 });
  }

  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Basic ")) {
    const encoded = authHeader.slice("Basic ".length);
    const [user, password] = Buffer.from(encoded, "base64")
      .toString("utf-8")
      .split(":");

    if (user === validUser && password === validPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Faktencheck-Inbox"' },
  });
}

export const config = {
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico).*)"],
};
