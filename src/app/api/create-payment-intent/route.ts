import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { MAX_QUANTITY_PER_ITEM } from "@/lib/checkout-config";
import { priceCart, type PricedLine } from "@/lib/pricing";

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

  const pricedLines: PricedLine[] = [];
  const orderLines: string[] = [];
  const orderLineItems: { slug: string; quantity: number }[] = [];

  for (const rawItem of rawItems) {
    const product = products.find((p) => p.slug === rawItem.slug);
    const quantity = Number(rawItem.quantity);
    if (product && Number.isInteger(quantity) && quantity > MAX_QUANTITY_PER_ITEM) {
      return NextResponse.json(
        {
          error: `You can order at most ${MAX_QUANTITY_PER_ITEM} of each soap. Please reduce the quantity of ${product.name}.`,
        },
        { status: 400 },
      );
    }
    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      continue;
    }
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
