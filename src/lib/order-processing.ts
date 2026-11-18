import { LOW_STOCK_THRESHOLD } from "@/lib/checkout-config";
import { decrementStock } from "@/lib/inventory";
import type { Order } from "@/lib/orders";
import { getRedis } from "@/lib/redis";

// Stripe can deliver the same webhook more than once, and a delivery can fail
// halfway. Each side effect (one soap's stock update, one email) therefore
// takes a "done" marker in Redis before it runs, so a repeat delivery skips
// what already happened. A step that fails releases its marker so it can be
// retried (e.g. with "Resend" on the event in the Stripe dashboard).
const CLAIM_TTL_SECONDS = 30 * 24 * 60 * 60;

export type Claim =
  // First time: go ahead.
  | "claimed"
  // Already done by an earlier delivery: skip.
  | "duplicate"
  // Redis couldn't be reached, so we can't tell.
  | "unavailable";

export async function claimOnce(key: string): Promise<Claim> {
  try {
    const result = await getRedis().set(key, "1", {
      nx: true,
      ex: CLAIM_TTL_SECONDS,
    });
    return result === "OK" ? "claimed" : "duplicate";
  } catch (err) {
    console.error(`[order] Could not record progress for ${key}:`, err);
    return "unavailable";
  }
}

export async function releaseClaim(key: string): Promise<void> {
  try {
    await getRedis().del(key);
  } catch (err) {
    console.error(`[order] Could not release ${key}:`, err);
  }
}

export type StockOutcome = {
  // Tracked soaps whose stock was just reduced.
  updated: { name: string; remaining: number; oversold: boolean }[];
  // Soaps whose stock could not be updated at all.
  failed: string[];
};

// Subtracts what this order bought from tracked stock. Soaps with no stock
// number (untracked) are left alone.
export async function applyOrderStock(order: Order): Promise<StockOutcome> {
  const outcome: StockOutcome = { updated: [], failed: [] };

  for (const item of order.items) {
    const key = `order:${order.reference}:stock:${item.slug}`;
    const claim = await claimOnce(key);
    if (claim === "duplicate") continue;
    if (claim === "unavailable") {
      outcome.failed.push(item.name);
      continue;
    }

    try {
      const result = await decrementStock(item.slug, item.quantity);
      if (result.tracked && result.remaining !== null) {
        outcome.updated.push({
          name: item.name,
          remaining: result.remaining,
          oversold: result.oversold,
        });
      }
    } catch (err) {
      console.error(`[order] Could not update stock for ${item.slug}:`, err);
      await releaseClaim(key);
      outcome.failed.push(item.name);
    }
  }

  return outcome;
}

// What the owner needs to know about stock after this order. Nothing is said
// when everything is comfortably in stock.
export function describeStockOutcome(outcome: StockOutcome): string[] {
  const notes: string[] = [];

  if (outcome.failed.length > 0) {
    notes.push(
      `⚠ Stock could not be updated automatically for ${outcome.failed.join(", ")}. Please check the stock page.`,
    );
  }

  for (const line of outcome.updated) {
    if (line.oversold) {
      notes.push(
        `⚠ ${line.name}: more was bought than was in stock, so it's now at 0. You may need to make more or refund part of this order.`,
      );
    } else if (line.remaining === 0) {
      notes.push(`${line.name} is now sold out.`);
    } else if (line.remaining <= LOW_STOCK_THRESHOLD) {
      notes.push(`${line.name}: only ${line.remaining} left.`);
    }
  }

  return notes;
}
