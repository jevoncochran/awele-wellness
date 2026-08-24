import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { SHIPPING_RATE_PER_BAR } from "@/lib/checkout-config";

const MAX_QUANTITY_PER_LINE = 20;
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

  let body: { items?: CartLineInput[]; shipping?: ShippingInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const rawItems = Array.isArray(body.items) ? body.items : [];

  let subtotalCents = 0;
  let totalBars = 0;
  const orderLines: string[] = [];

  for (const rawItem of rawItems) {
    const product = products.find((p) => p.slug === rawItem.slug);
    const quantity = Number(rawItem.quantity);
    if (
      !product ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QUANTITY_PER_LINE
    ) {
      continue;
    }
    subtotalCents += Math.round(product.price * 100) * quantity;
    totalBars += quantity;
    orderLines.push(`${product.name} x${quantity}`);
  }

  if (totalBars === 0) {
    return NextResponse.json(
      { error: "Your cart is empty or invalid." },
      { status: 400 },
    );
  }

  const shippingCents = Math.round(SHIPPING_RATE_PER_BAR * 100) * totalBars;
  const amount = subtotalCents + shippingCents;

  let orderItemsSummary = orderLines.join("; ");
  if (orderItemsSummary.length > MAX_METADATA_VALUE_LENGTH) {
    orderItemsSummary =
      orderItemsSummary.slice(0, MAX_METADATA_VALUE_LENGTH - 1) + "…";
  }

  const stripe = new Stripe(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      payment_method_types: ["card", "cashapp"],
      shipping: buildShippingParam(body.shipping),
      metadata: {
        order_items: orderItemsSummary,
        total_bars: String(totalBars),
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
