import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/admin-session";

// Convenience redirect only: sends logged-out visitors to the login page. The
// real checks live in requireAdmin(), called by every admin page and action.
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/login") {
    return NextResponse.next();
  }

  const loggedIn = await verifyAdminSession(
    request.cookies.get(ADMIN_COOKIE)?.value,
  );
  if (!loggedIn) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
