import { SHIPPING_RATE_PER_BAR } from "@/lib/checkout-config";

// Bundle deals apply to any mix of soaps, counted by total bars in the cart.
export const BUNDLE_DEALS = [
  { bars: 2, cents: 1500 },
  { bars: 3, cents: 2000 },
  { bars: 4, cents: 2500 },
] as const;

export type PricedLine = {
  priceCents: number;
  quantity: number;
};

export type CartPricing = {
  barCount: number;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

// Cheapest way to buy `bars` bars by combining deals and single bars, so 5+
// bars always get the best price for the customer (e.g. 5 = 4-pack + 1).
export function bundlePriceCents(unitCents: number, bars: number): number {
  const best: number[] = [0];
  for (let n = 1; n <= bars; n++) {
    let cheapest = best[n - 1] + unitCents;
    for (const deal of BUNDLE_DEALS) {
      if (deal.bars <= n) {
        cheapest = Math.min(cheapest, best[n - deal.bars] + deal.cents);
      }
    }
    best.push(cheapest);
  }
  return best[bars];
}

export type OrderAmounts = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
};

function readCents(value: string | undefined): number | null {
  return value !== undefined && /^\d+$/.test(value) ? Number(value) : null;
}

// Reads the amounts create-payment-intent recorded on the PaymentIntent. For
// orders created before those fields existed it falls back to list prices
// with no discount and shipping inferred as total - subtotal.
export function orderAmountsFromMetadata(
  metadata: Record<string, string>,
  listSubtotalCents: number,
  totalCents: number,
): OrderAmounts {
  const subtotalCents =
    readCents(metadata.subtotal_cents) ?? listSubtotalCents;
  const discountCents = readCents(metadata.bundle_discount_cents) ?? 0;
  const shippingCents =
    readCents(metadata.shipping_cents) ??
    Math.max(0, totalCents - subtotalCents + discountCents);
  return { subtotalCents, discountCents, shippingCents };
}

// Adapts resolved cart lines (item + product) for the client components.
export function pricedLinesFromCart(
  lines: { item: { quantity: number }; product: { price: number } }[],
): PricedLine[] {
  return lines.map(({ item, product }) => ({
    priceCents: Math.round(product.price * 100),
    quantity: item.quantity,
  }));
}

// Pure and shared by the cart, checkout summary and the server-side
// PaymentIntent so the amount shown is always the amount charged.
export function priceCart(lines: PricedLine[]): CartPricing {
  const barCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.priceCents * line.quantity,
    0,
  );

  // Assumes soaps share one price (true today). If prices ever differ, bundles
  // are priced from the highest unit price and the discount never goes below 0.
  const unitCents = Math.max(0, ...lines.map((line) => line.priceCents));
  const discountCents = Math.max(
    0,
    subtotalCents - bundlePriceCents(unitCents, barCount),
  );

  const shippingCents = Math.round(SHIPPING_RATE_PER_BAR * 100) * barCount;

  return {
    barCount,
    subtotalCents,
    discountCents,
    shippingCents,
    totalCents: subtotalCents - discountCents + shippingCents,
  };
}
