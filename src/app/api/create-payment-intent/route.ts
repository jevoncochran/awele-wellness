import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import {
  findProduct,
  getCatalogFresh,
  type CatalogProduct,
} from "@/lib/catalog";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/checkout-config";
import { findUnavailable, getInventory, type Inventory } from "@/lib/inventory";
import { priceCart, type PricedLine } from "@/lib/pricing";
import { unavailableMessage } from "@/lib/purchase-limits";

const MAX_METADATA_VALUE_LENGTH = 500;

type CartLineInput = {
  slug?: unknown;
  quantity?: unknown;
};

type ShippingInput = {
  name?: unknown;
  phone?: unknown;
  address?: {
    line1?: unknown;
    line2?: unknown;
    city?: unknown;
    state?: unknown;
    postal_code?: unknown;
    country?: unknown;
  };
};

function buildShippingParam(
  shipping: ShippingInput | undefined,
): Stripe.PaymentIntentCreateParams.Shipping | undefined {
  const name = typeof shipping?.name === "string" ? shipping.name.trim() : "";
  const line1 =
    typeof shipping?.address?.line1 === "string"
      ? shipping.address.line1.trim()
      : "";
  const city =
    typeof shipping?.address?.city === "string"
      ? shipping.address.city.trim()
      : "";
  const state =
    typeof shipping?.address?.state === "string"
      ? shipping.address.state.trim()
      : "";
  const postalCode =
    typeof shipping?.address?.postal_code === "string"
      ? shipping.address.postal_code.trim()
      : "";
  const country =
    typeof shipping?.address?.country === "string"
      ? shipping.address.country.trim()
      : "";
  const line2 =
    typeof shipping?.address?.line2 === "string"
      ? shipping.address.line2.trim()
      : "";
  const phone =
    typeof shipping?.phone === "string" ? shipping.phone.trim() : "";

  if (!name || !line1 || !city || !state || !postalCode || !country) {
    // Incomplete shipping data — skip attaching it rather than failing the
    // whole payment; the checkout form already requires these fields, so
    // this should only happen if something upstream is malformed.
    return undefined;
  }

  return {
    name,
    phone: phone || undefined,
    address: {
      line1,
      line2: line2 || undefined,
      city,
      state,
      postal_code: postalCode,
      country,
    },
  };
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      {
        error:
          "Stripe is not configured yet. Add STRIPE_SECRET_KEY to your environment.",
      },
      { status: 500 },
    );
  }

  let body: {
    items?: CartLineInput[];
    shipping?: ShippingInput;
    email?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];
  const email = typeof body.email === "string" ? body.email.trim() : "";

  // The soaps as they are right now (not the cached copy the shop pages use).
  let catalog: CatalogProduct[];
  try {
    catalog = await getCatalogFresh();
  } catch (err) {
    console.error("[create-payment-intent] Could not read the catalog:", err);
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 503 },
    );
  }

  // One entry per soap: repeated lines for the same soap are added together so
  // the quantity limit and the stock check see the true total.
  const requested = new Map<
    string,
    { product: CatalogProduct; quantity: number }
  >();

  for (const rawItem of rawItems) {
    const product =
      typeof rawItem.slug === "string"
        ? findProduct(catalog, rawItem.slug)
        : undefined;
    const quantity = Number(rawItem.quantity);
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      continue;
    }
    const total = (requested.get(product.slug)?.quantity ?? 0) + quantity;
    if (total > MAX_QUANTITY_PER_ITEM) {
      return NextResponse.json(
        {
          error: `You can order at most ${MAX_QUANTITY_PER_ITEM} of each soap. Please reduce the quantity of ${product.name}.`,
        },
        { status: 400 },
      );
    }
    requested.set(product.slug, { product, quantity: total });
  }

  const pricedLines: PricedLine[] = [];
  const orderLines: string[] = [];
  const orderLineItems: { slug: string; quantity: number }[] = [];

  for (const { product, quantity } of requested.values()) {
    pricedLines.push({ priceCents: Math.round(product.price * 100), quantity });
    orderLines.push(`${product.name} x${quantity}`);
    orderLineItems.push({ slug: product.slug, quantity });
  }

  // Bundle discount and shipping come from the same shared function the cart
  // and checkout summary use, so the amount charged matches the amount shown.
  const pricing = priceCart(pricedLines);

  if (pricing.barCount === 0) {
    return NextResponse.json(
      { error: "Your cart is empty or invalid." },
      { status: 400 },
    );
  }

  // Never take payment for soap that is hidden, sold out, or no longer in
  // stock. Stock is read fresh (not the cached copy the storefront uses). If
  // stock itself can't be read we let the order through rather than turn away
  // paying customers (hidden soaps are still refused); the failure is logged.
  let inventory: Inventory = {};
  try {
    inventory = await getInventory(catalog);
  } catch (err) {
    console.error("[create-payment-intent] Could not check stock:", err);
  }
  const unavailable = findUnavailable(inventory, orderLineItems, catalog);
  if (unavailable.length > 0) {
    return NextResponse.json(
      { error: unavailableMessage(unavailable), unavailable },
      { status: 409 },
    );
  }

  const amount = pricing.totalCents;

  let orderItemsSummary = orderLines.join("; ");
  if (orderItemsSummary.length > MAX_METADATA_VALUE_LENGTH) {
    orderItemsSummary =
      orderItemsSummary.slice(0, MAX_METADATA_VALUE_LENGTH - 1) + "…";
  }

  // Structured line items for re-resolving full product details later (e.g.
  // in the webhook, to build the order confirmation email) without having
  // to parse the human-readable order_items string back apart.
  const orderItemsJson = JSON.stringify(orderLineItems);

  const stripe = new Stripe(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card", "cashapp"],
      shipping: buildShippingParam(body.shipping),
      receipt_email: email || undefined,
      metadata: {
        order_items: orderItemsSummary,
        total_bars: String(pricing.barCount),
        subtotal_cents: String(pricing.subtotalCents),
        bundle_discount_cents: String(pricing.discountCents),
        shipping_cents: String(pricing.shippingCents),
        ...(orderItemsJson.length <= MAX_METADATA_VALUE_LENGTH
          ? { order_items_json: orderItemsJson }
          : {}),
      },
    });

    return NextResponse.json({ clientSecret: paymentIntent.client_secret });
  } catch {
    return NextResponse.json(
      { error: "Could not start payment. Please try again." },
      { status: 502 },
    );
  }
}
