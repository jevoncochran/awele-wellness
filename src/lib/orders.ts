import type Stripe from "stripe";
import { orderAmountsFromMetadata } from "@/lib/pricing";
import { products } from "@/lib/products";

export type OrderItem = {
  name: string;
  quantity: number;
  price: number;
};

export type Order = {
  reference: string;
  createdAt: Date;
  customer: {
    name: string;
    email: string | null;
    phone: string | null;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  shippingAddress: {
    name: string;
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  paymentMethodLabel: string;
};

export type OrderResult =
  | { ok: true; order: Order }
  | { ok: false; reason: string };

function formatPaymentMethodLabel(
  paymentMethod: Stripe.PaymentMethod | null,
): string {
  if (!paymentMethod) return "your payment method";

  if (paymentMethod.type === "card" && paymentMethod.card) {
    const brand =
      paymentMethod.card.brand.charAt(0).toUpperCase() +
      paymentMethod.card.brand.slice(1);
    return `${brand} ending in ${paymentMethod.card.last4}`;
  }

  if (paymentMethod.type === "cashapp") {
    return "Cash App Pay";
  }

  return paymentMethod.type.charAt(0).toUpperCase() + paymentMethod.type.slice(1);
}

async function resolvePaymentMethod(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
): Promise<Stripe.PaymentMethod | null> {
  if (typeof paymentIntent.payment_method === "string") {
    try {
      return await stripe.paymentMethods.retrieve(paymentIntent.payment_method);
    } catch (err) {
      console.error(
        `[webhook] Could not retrieve payment method for ${paymentIntent.id}:`,
        err,
      );
      return null;
    }
  }
  return paymentIntent.payment_method ?? null;
}

// Normalizes a succeeded PaymentIntent into the order that the customer and
// owner emails are built from. A missing receipt email is allowed here (the
// owner still needs to hear about the order); callers decide what to do.
export async function buildOrderFromPaymentIntent(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
): Promise<OrderResult> {
  const shipping = paymentIntent.shipping;
  if (!shipping?.address) {
    return { ok: false, reason: "has no shipping address" };
  }

  let orderLineItems: { slug: string; quantity: number }[] = [];
  try {
    orderLineItems = JSON.parse(
      paymentIntent.metadata.order_items_json ?? "[]",
    );
  } catch {
    orderLineItems = [];
  }

  const items = orderLineItems
    .map(({ slug, quantity }) => {
      const product = products.find((p) => p.slug === slug);
      return product
        ? { name: product.name, quantity, price: product.price }
        : null;
    })
    .filter((line): line is OrderItem => line !== null);

  if (items.length === 0) {
    return { ok: false, reason: "has no order items that could be resolved" };
  }

  const listSubtotalCents = items.reduce(
    (sum, item) => sum + Math.round(item.price * 100) * item.quantity,
    0,
  );
  const amounts = orderAmountsFromMetadata(
    paymentIntent.metadata,
    listSubtotalCents,
    paymentIntent.amount,
  );

  const paymentMethod = await resolvePaymentMethod(stripe, paymentIntent);

  return {
    ok: true,
    order: {
      reference: paymentIntent.id,
      createdAt: new Date(paymentIntent.created * 1000),
      customer: {
        name: shipping.name ?? "",
        email: paymentIntent.receipt_email,
        phone: shipping.phone ?? null,
      },
      items,
      subtotal: amounts.subtotalCents / 100,
      discount: amounts.discountCents / 100,
      shipping: amounts.shippingCents / 100,
      total: paymentIntent.amount / 100,
      shippingAddress: {
        name: shipping.name ?? "",
        line1: shipping.address.line1 ?? "",
        line2: shipping.address.line2 ?? undefined,
        city: shipping.address.city ?? "",
        state: shipping.address.state ?? "",
        postalCode: shipping.address.postal_code ?? "",
        country: shipping.address.country ?? "",
      },
      paymentMethodLabel: formatPaymentMethodLabel(paymentMethod),
    },
  };
}
