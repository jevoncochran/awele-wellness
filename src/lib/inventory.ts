import { unstable_cache } from "next/cache";
import { getRedis } from "@/lib/redis";
import { products } from "@/lib/products";

// One hash keyed by product slug. A slug with no entry is "untracked": it is
// sold normally, with no limit, until the owner sets a quantity. A quantity of
// 0 means sold out.
const STOCK_KEY = "inventory:stock";

export const MAX_STOCK_QUANTITY = 9999;

export type StockInfo = {
  // null means untracked (no quantity limit).
  quantity: number | null;
  soldOut: boolean;
};

export type Inventory = Record<string, StockInfo>;

export type Unavailable = {
  slug: string;
  name: string;
  reason: "sold_out" | "insufficient";
  // How many can still be ordered (0 when sold out).
  available: number;
};

export function describeStock(quantity: number | null): StockInfo {
  return { quantity, soldOut: quantity !== null && quantity <= 0 };
}

function untrackedInventory(): Inventory {
  return Object.fromEntries(
    products.map((product) => [product.slug, describeStock(null)]),
  );
}

// Reads stock for every product. Throws if the store is unreachable, so the
// admin page never shows (and then overwrites with) made-up numbers.
export async function getInventory(): Promise<Inventory> {
  const stock = await getRedis().hgetall<Record<string, number>>(STOCK_KEY);

  return Object.fromEntries(
    products.map((product) => {
      const quantity = stock?.[product.slug];
      return [
        product.slug,
        describeStock(typeof quantity === "number" ? quantity : null),
      ];
    }),
  );
}

// Cache tag for stock shown on the storefront. Saving stock in the admin page
// calls updateTag(INVENTORY_TAG) so the shop reflects the change immediately.
export const INVENTORY_TAG = "inventory";

// The pages that show this are statically generated, so stock is read through
// Next's data cache. If the read throws nothing is cached, which keeps a brief
// Redis outage from freezing a wrong answer; the short `revalidate` is a safety
// net in case an invalidation is ever missed.
const getCachedInventory = unstable_cache(getInventory, ["storefront-inventory"], {
  tags: [INVENTORY_TAG],
  revalidate: 60,
});

// For customer-facing pages: if the store is down, keep the shop selling
// instead of taking the whole site down with it.
export async function getStorefrontInventory(): Promise<Inventory> {
  try {
    return await getCachedInventory();
  } catch (err) {
    console.error("[inventory] Could not read stock; treating all as available:", err);
    return untrackedInventory();
  }
}

export function validateStockQuantity(
  slug: string,
  quantity: number | null,
): string | null {
  if (!products.some((product) => product.slug === slug)) {
    return `Unknown product: ${slug}`;
  }
  if (
    quantity !== null &&
    (!Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > MAX_STOCK_QUANTITY)
  ) {
    return `Quantity must be a whole number from 0 to ${MAX_STOCK_QUANTITY}.`;
  }
  return null;
}

// `null` stops tracking the soap (sold without a limit).
export async function saveStock(
  slug: string,
  quantity: number | null,
): Promise<void> {
  const error = validateStockQuantity(slug, quantity);
  if (error) throw new Error(error);

  const redis = getRedis();
  if (quantity === null) {
    await redis.hdel(STOCK_KEY, slug);
  } else {
    await redis.hset(STOCK_KEY, { [slug]: quantity });
  }
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
