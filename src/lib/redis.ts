import { Redis } from "@upstash/redis";

let redisClient: Redis | null = null;

// Accepts the names Upstash documents as well as the KV_* names the Vercel
// Marketplace integration injects.
export function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Redis is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}
