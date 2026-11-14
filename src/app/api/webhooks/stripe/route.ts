import Stripe from "stripe";
import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { buildOrderFromPaymentIntent, type Order } from "@/lib/orders";
import { buildOrderConfirmationEmail } from "@/lib/email/order-confirmation";
import { buildOwnerNotificationEmail } from "@/lib/email/owner-notification";

const DEFAULT_FROM_EMAIL = "Awele Wellness <onboarding@resend.dev>";

type OutgoingEmail = {
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
};

// Resend reports API failures (e.g. a 403 for an unverified recipient) in the
// returned `error` instead of throwing, so both outcomes are handled here.
async function deliverEmail(
  resend: Resend,
  email: OutgoingEmail,
  description: string,
  reference: string,
) {
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;

  try {
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: email.to,
      replyTo: email.replyTo,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      console.error(
        `[webhook] Failed to send ${description} for ${reference}:`,
        error,
      );
      return;
    }
    console.log(
      `[webhook] ${description} sent for ${reference} to ${email.to}.`,
    );
  } catch (err) {
    console.error(
      `[webhook] Failed to send ${description} for ${reference}:`,
      err,
    );
  }
}

async function sendOrderConfirmationEmail(order: Order) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(
      `[webhook] Skipping confirmation email for ${order.reference} — RESEND_API_KEY not configured.`,
    );
    return;
  }

  const toEmail = order.customer.email;
  if (!toEmail) {
    console.error(
      `[webhook] Payment ${order.reference} succeeded but has no receipt_email — cannot send confirmation.`,
    );
    return;
  }

  const email = buildOrderConfirmationEmail({
    customerName: order.customer.name.split(" ")[0] || "there",
    orderReference: order.reference,
    orderDate: order.createdAt,
    items: order.items,
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    shippingAddress: order.shippingAddress,
    paymentMethodLabel: order.paymentMethodLabel,
  });

  await deliverEmail(
    new Resend(resendApiKey),
    { to: toEmail, ...email },
    "Order confirmation email",
    order.reference,
  );
}

async function sendOwnerNotificationEmail(order: Order) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!resendApiKey || !ownerEmail) {
    console.log(
      `[webhook] Skipping owner notification for ${order.reference} — RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL not configured.`,
    );
    return;
  }

  const email = buildOwnerNotificationEmail(order);

  await deliverEmail(
    new Resend(resendApiKey),
    {
      to: ownerEmail,
      // Lets the owner reply straight to the customer from their inbox.
      replyTo: order.customer.email ?? undefined,
      ...email,
    },
    "Owner order notification",
    order.reference,
  );
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
      const result = await buildOrderFromPaymentIntent(stripe, paymentIntent);
      if (!result.ok) {
        console.error(
          `[webhook] Payment ${paymentIntent.id} succeeded but ${result.reason} — cannot build order emails.`,
        );
      } else {
        // Each email has its own try/catch so one failing never blocks the other.
        for (const [label, send] of [
          ["confirmation email", sendOrderConfirmationEmail],
          ["owner notification", sendOwnerNotificationEmail],
        ] as const) {
          try {
            await send(result.order);
          } catch (err) {
            console.error(
              `[webhook] Error while sending ${label} for ${paymentIntent.id}:`,
              err,
            );
          }
        }
      }
    } catch (err) {
      console.error(
        `[webhook] Error while processing order for ${paymentIntentSummary.id}:`,
        err,
      );
    }

    // No order-storage/DB yet — persisting orders is a separate future step,
    // not handled here.
  }

  return NextResponse.json({ received: true });
}
