import { Redis } from "@upstash/redis";
import { products } from "@/lib/products";

// Two hashes keyed by product slug. A slug with no entry in STOCK_KEY is
// "untracked": it is sold normally until the owner sets a quantity.
const STOCK_KEY = "inventory:stock";
const PAUSED_KEY = "inventory:paused";

export const MAX_STOCK_QUANTITY = 9999;

export type StockInfo = {
  // null means untracked (no quantity limit).
  quantity: number | null;
  // Owner has manually marked the soap as sold out.
  paused: boolean;
  soldOut: boolean;
};

export type Inventory = Record<string, StockInfo>;

export type StockUpdate = {
  quantity: number | null;
  paused: boolean;
};

export type Unavailable = {
  slug: string;
  name: string;
  reason: "sold_out" | "insufficient";
  // How many can still be ordered (0 when sold out).
  available: number;
};

let redisClient: Redis | null = null;

// Accepts the names Upstash documents as well as the KV_* names the Vercel
// Marketplace integration injects.
function getRedis(): Redis {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Inventory store is not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

export function describeStock(
  quantity: number | null,
  paused: boolean,
): StockInfo {
  return {
    quantity,
    paused,
    soldOut: paused || (quantity !== null && quantity <= 0),
  };
}

function untrackedInventory(): Inventory {
  return Object.fromEntries(
    products.map((product) => [product.slug, describeStock(null, false)]),
  );
}

// Reads stock for every product. Throws if the store is unreachable, so the
// admin page never shows (and then overwrites with) made-up numbers.
export async function getInventory(): Promise<Inventory> {
  const redis = getRedis();
  const [stock, paused] = await Promise.all([
    redis.hgetall<Record<string, number>>(STOCK_KEY),
    redis.hgetall<Record<string, number>>(PAUSED_KEY),
  ]);

  return Object.fromEntries(
    products.map((product) => {
      const quantity = stock?.[product.slug];
      return [
        product.slug,
        describeStock(
          typeof quantity === "number" ? quantity : null,
          Boolean(paused?.[product.slug]),
        ),
      ];
    }),
  );
}

// For customer-facing pages: if the store is down, keep the shop selling
// instead of taking the whole site down with it.
export async function getStorefrontInventory(): Promise<Inventory> {
  try {
    return await getInventory();
  } catch (err) {
    console.error("[inventory] Could not read stock; treating all as available:", err);
    return untrackedInventory();
  }
}

export function validateStockUpdate(
  slug: string,
  update: StockUpdate,
): string | null {
  if (!products.some((product) => product.slug === slug)) {
    return `Unknown product: ${slug}`;
  }
  if (
    update.quantity !== null &&
    (!Number.isInteger(update.quantity) ||
      update.quantity < 0 ||
      update.quantity > MAX_STOCK_QUANTITY)
  ) {
    return `Quantity must be a whole number from 0 to ${MAX_STOCK_QUANTITY}.`;
  }
  return null;
}

export async function saveStock(
  slug: string,
  update: StockUpdate,
): Promise<void> {
  const error = validateStockUpdate(slug, update);
  if (error) throw new Error(error);

  const pipeline = getRedis().pipeline();
  if (update.quantity === null) {
    pipeline.hdel(STOCK_KEY, slug);
  } else {
    pipeline.hset(STOCK_KEY, { [slug]: update.quantity });
  }
  if (update.paused) {
    pipeline.hset(PAUSED_KEY, { [slug]: 1 });
  } else {
    pipeline.hdel(PAUSED_KEY, slug);
  }
  await pipeline.exec();
}

// Which requested lines can't be fulfilled from current stock.
export function findUnavailable(
  inventory: Inventory,
  requested: { slug: string; quantity: number }[],
): Unavailable[] {
  const problems: Unavailable[] = [];

  for (const { slug, quantity } of requested) {
    const info = inventory[slug];
    const product = products.find((p) => p.slug === slug);
    if (!info || !product) continue;

    if (info.soldOut) {
      problems.push({ slug, name: product.name, reason: "sold_out", available: 0 });
    } else if (info.quantity !== null && quantity > info.quantity) {
      problems.push({
        slug,
        name: product.name,
        reason: "insufficient",
        available: info.quantity,
      });
    }
  }

  return problems;
}

// Subtracts a purchased quantity from tracked stock, never below zero.
// Untracked soaps are left alone. `oversold` means more was bought than was
// left (two customers paid for the last bar at the same time).
export async function decrementStock(
  slug: string,
  quantity: number,
): Promise<{ tracked: boolean; remaining: number | null; oversold: boolean }> {
  const redis = getRedis();

  const tracked = (await redis.hexists(STOCK_KEY, slug)) === 1;
  if (!tracked) return { tracked: false, remaining: null, oversold: false };

  const remaining = await redis.hincrby(STOCK_KEY, slug, -quantity);
  if (remaining < 0) {
    await redis.hset(STOCK_KEY, { [slug]: 0 });
    return { tracked: true, remaining: 0, oversold: true };
  }
  return { tracked: true, remaining, oversold: false };
}
