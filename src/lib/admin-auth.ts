import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_SECONDS,
  signAdminSession,
  verifyAdminSession,
} from "@/lib/admin-session";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// Compares fixed-length hashes in constant time so response timing can't leak
// how much of a guess was correct.
export function passwordMatches(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    console.error("[admin] ADMIN_PASSWORD is not set; nobody can log in.");
    return false;
  }
  return timingSafeEqual(digest(input), digest(expected));
}

export async function startAdminSession() {
  const token = await signAdminSession();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    // Browsers don't reliably accept Secure cookies on plain-http localhost.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/",
  });
}

export async function endAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  return verifyAdminSession(cookieStore.get(ADMIN_COOKIE)?.value);
}

// Call at the top of every admin page and Server Action. The proxy redirect is
// only a convenience; this is the real check.
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/admin/login");
}
