import Stripe from "stripe";
import { Resend } from "resend";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { INVENTORY_TAG } from "@/lib/inventory";
import { buildOrderFromPaymentIntent, type Order } from "@/lib/orders";
import {
  applyOrderStock,
  claimOnce,
  describeStockOutcome,
  releaseClaim,
} from "@/lib/order-processing";
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

// "skipped" = intentionally not sent (not configured / nobody to send to);
// "failed" = tried and Resend or the network said no.
type SendResult = "sent" | "skipped" | "failed";

// Resend reports API failures (e.g. a 403 for an unverified recipient) in the
// returned `error` instead of throwing, so both outcomes are handled here.
async function deliverEmail(
  resend: Resend,
  email: OutgoingEmail,
  description: string,
  reference: string,
): Promise<SendResult> {
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
      return "failed";
    }
    console.log(
      `[webhook] ${description} sent for ${reference} to ${email.to}.`,
    );
    return "sent";
  } catch (err) {
    console.error(
      `[webhook] Failed to send ${description} for ${reference}:`,
      err,
    );
    return "failed";
  }
}

async function sendOrderConfirmationEmail(order: Order): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.log(
      `[webhook] Skipping confirmation email for ${order.reference} — RESEND_API_KEY not configured.`,
    );
    return "skipped";
  }

  const toEmail = order.customer.email;
  if (!toEmail) {
    console.error(
      `[webhook] Payment ${order.reference} succeeded but has no receipt_email — cannot send confirmation.`,
    );
    return "skipped";
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

  return deliverEmail(
    new Resend(resendApiKey),
    { to: toEmail, ...email },
    "Order confirmation email",
    order.reference,
  );
}

async function sendOwnerNotificationEmail(
  order: Order,
  stockNotes: string[],
): Promise<SendResult> {
  const resendApiKey = process.env.RESEND_API_KEY;
  const ownerEmail = process.env.ORDER_NOTIFICATION_EMAIL;
  if (!resendApiKey || !ownerEmail) {
    console.log(
      `[webhook] Skipping owner notification for ${order.reference} — RESEND_API_KEY or ORDER_NOTIFICATION_EMAIL not configured.`,
    );
    return "skipped";
  }

  const email = buildOwnerNotificationEmail(order, stockNotes);

  return deliverEmail(
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

// Runs an email at most once per order. If Redis can't be reached we send
// anyway: a possible duplicate is better than a missing order email.
async function sendOnce(
  key: string,
  send: () => Promise<SendResult>,
): Promise<void> {
  const claim = await claimOnce(key);
  if (claim === "duplicate") {
    console.log(`[webhook] ${key} was already handled, skipping.`);
    return;
  }

  const result = await send();
  if (claim === "claimed" && result !== "sent") await releaseClaim(key);
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

    // The payment itself already succeeded, so nothing below should make Stripe
    // retry the whole webhook: failures are logged and the endpoint still
    // answers 200. Each step records when it is done, so re-sending the event
    // from the Stripe dashboard only repeats what failed.
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
        const { order } = result;

        // 1. Take the soap out of stock, so the owner email can say what sold out.
        let stockNotes: string[] = [];
        try {
          const outcome = await applyOrderStock(order);
          stockNotes = describeStockOutcome(outcome);
          if (outcome.updated.length > 0) {
            // Makes the shop and product pages show the new stock right away.
            revalidateTag(INVENTORY_TAG, { expire: 0 });
          }
        } catch (err) {
          console.error(
            `[webhook] Error while updating stock for ${paymentIntent.id}:`,
            err,
          );
          stockNotes = [
            "⚠ Stock could not be updated automatically. Please check the stock page.",
          ];
        }

        // 2 & 3. The emails. Each has its own try/catch so one failing never
        // blocks the other.
        const emailSteps: [string, () => Promise<void>][] = [
          [
            "confirmation email",
            () =>
              sendOnce(`order:${order.reference}:customer-email`, () =>
                sendOrderConfirmationEmail(order),
              ),
          ],
          [
            "owner notification",
            () =>
              sendOnce(`order:${order.reference}:owner-email`, () =>
                sendOwnerNotificationEmail(order, stockNotes),
              ),
          ],
        ];
        for (const [label, run] of emailSteps) {
          try {
            await run();
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
  }

  return NextResponse.json({ received: true });
}
