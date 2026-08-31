import Stripe from "stripe";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { products } from "@/lib/products";
import { buildOrderConfirmationEmail } from "@/lib/email/order-confirmation";

const DEFAULT_FROM_EMAIL = "Awele Wellness <onboarding@resend.dev>";

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

async function sendOrderConfirmationEmail(
  stripe: Stripe,
  paymentIntent: Stripe.PaymentIntent,
) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(
      `[webhook] Skipping confirmation email for ${paymentIntent.id} — RESEND_API_KEY not configured.`,
    );
    return;
  }

  const toEmail = paymentIntent.receipt_email;
  if (!toEmail) {
    console.error(
      `[webhook] Payment ${paymentIntent.id} succeeded but has no receipt_email — cannot send confirmation.`,
    );
    return;
  }

  const shipping = paymentIntent.shipping;
  if (!shipping?.address) {
    console.error(
      `[webhook] Payment ${paymentIntent.id} succeeded but has no shipping address — cannot build confirmation email.`,
    );
    return;
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
    .filter((line): line is { name: string; quantity: number; price: number } =>
      line !== null,
    );

  if (items.length === 0) {
    console.error(
      `[webhook] Payment ${paymentIntent.id} succeeded but no order items could be resolved — cannot build confirmation email.`,
    );
    return;
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = paymentIntent.amount / 100;
  const shippingCost = Math.max(0, total - subtotal);

  let paymentMethod: Stripe.PaymentMethod | null = null;
  if (typeof paymentIntent.payment_method === "string") {
    try {
      paymentMethod = await stripe.paymentMethods.retrieve(
        paymentIntent.payment_method,
      );
    } catch (err) {
      console.error(
        `[webhook] Could not retrieve payment method for ${paymentIntent.id}:`,
        err,
      );
    }
  } else if (paymentIntent.payment_method) {
    paymentMethod = paymentIntent.payment_method;
  }

  const email = buildOrderConfirmationEmail({
    customerName: shipping.name?.split(" ")[0] || "there",
    orderReference: paymentIntent.id,
    orderDate: new Date(paymentIntent.created * 1000),
    items,
    subtotal,
    shipping: shippingCost,
    total,
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
  });

  const resend = new Resend(resendApiKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  try {
    await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    console.log(
      `[webhook] Order confirmation email sent for ${paymentIntent.id} to ${toEmail}.`,
    );
  } catch (err) {
    console.error(
      `[webhook] Failed to send confirmation email for ${paymentIntent.id}:`,
      err,
    );
  }
}

export async function POST(request: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secretKey || !webhookSecret) {
    return NextResponse.json(
      { error: "Stripe webhook is not configured." },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  const body = await request.text();

  const stripe = new Stripe(secretKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature ?? "",
      webhookSecret,
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const paymentIntentSummary = event.data.object;
    console.log(
      `Payment succeeded: ${paymentIntentSummary.id} for $${(paymentIntentSummary.amount / 100).toFixed(2)}`,
    );

    // A failed email should never make Stripe retry this whole webhook —
    // the payment itself already succeeded. Log and move on instead.
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentSummary.id,
        { expand: ["payment_method"] },
      );
      await sendOrderConfirmationEmail(stripe, paymentIntent);
    } catch (err) {
      console.error(
        `[webhook] Error while sending confirmation email for ${paymentIntentSummary.id}:`,
        err,
      );
    }

    // No order-storage/DB yet — persisting orders is a separate future step,
    // not handled here.
  }

  return NextResponse.json({ received: true });
}
