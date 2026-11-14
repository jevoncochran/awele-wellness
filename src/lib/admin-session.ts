import { SignJWT, jwtVerify } from "jose";

export const ADMIN_COOKIE = "awele_admin_session";
export const ADMIN_SESSION_SECONDS = 7 * 24 * 60 * 60;

const MIN_SECRET_LENGTH = 32;

function getKey(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `ADMIN_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters.`,
    );
  }
  return new TextEncoder().encode(secret);
}

// A signed token proving the holder logged in with the admin password. It
// carries no personal data; the signature is what makes it trustworthy.
export async function signAdminSession(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ADMIN_SESSION_SECONDS}s`)
    .sign(getKey());
}

// Any problem (missing, tampered, expired, secret not configured) means "not
// logged in", never an error page.
export async function verifyAdminSession(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, getKey(), {
      algorithms: ["HS256"],
    });
    return payload.role === "admin";
  } catch {
    return false;
  }
}
