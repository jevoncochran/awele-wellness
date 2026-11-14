import "server-only";
import { getRedis } from "@/lib/redis";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_SECONDS = 15 * 60;

export const LOCKOUT_MINUTES = WINDOW_SECONDS / 60;

function key(ip: string) {
  return `admin:failed-logins:${ip}`;
}

// If Redis is unreachable these fail open: the password is still required,
// we just can't count guesses.
export async function isLoginLocked(ip: string): Promise<boolean> {
  try {
    const failures = await getRedis().get<number>(key(ip));
    return (failures ?? 0) >= MAX_FAILED_ATTEMPTS;
  } catch (err) {
    console.error("[admin] Could not check login attempts:", err);
    return false;
  }
}

export async function recordFailedLogin(ip: string): Promise<void> {
  try {
    const redis = getRedis();
    const failures = await redis.incr(key(ip));
    if (failures === 1) await redis.expire(key(ip), WINDOW_SECONDS);
  } catch (err) {
    console.error("[admin] Could not record failed login:", err);
  }
}

export async function clearFailedLogins(ip: string): Promise<void> {
  try {
    await getRedis().del(key(ip));
  } catch (err) {
    console.error("[admin] Could not clear failed logins:", err);
  }
}
