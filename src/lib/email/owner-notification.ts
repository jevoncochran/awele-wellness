import type { Order } from "@/lib/orders";
import {
  BORDER,
  BRAND_GREEN,
  CREAM,
  INK,
  INK_MUTED,
  escapeHtml,
  formatCurrency,
} from "@/lib/email/format";

const NOT_PROVIDED = "Not provided";

// Email to the shop owner for every paid order: who bought, what to pack, and
// where to ship it.
export function buildOwnerNotificationEmail(
  order: Order,
  // Stock heads-ups from this order (sold out, low, oversold, or not updated).
  stockNotes: string[] = [],
): {
  subject: string;
  html: string;
  text: string;
} {
  const dateLabel = order.createdAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const barCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const barLabel = `${barCount} bar${barCount === 1 ? "" : "s"}`;
  const customerName = order.customer.name || "Customer";

  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 14px;">
            ${escapeHtml(item.name)}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 14px; text-align: center; font-weight: bold;">
            &times; ${item.quantity}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 14px; text-align: right;">
            ${formatCurrency(item.price * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  const itemsText = order.items
    .map(
      (item) =>
        `- ${item.name} x${item.quantity}: ${formatCurrency(item.price * item.quantity)}`,
    )
    .join("\n");

  const discountRowHtml =
    order.discount > 0
      ? `
                  <tr>
                    <td style="padding: 4px 0; color:${BRAND_GREEN}; font-size: 14px;">Bundle savings</td>
                    <td style="padding: 4px 0; color:${BRAND_GREEN}; font-size: 14px; text-align:right;">&minus;${formatCurrency(order.discount)}</td>
                  </tr>`
      : "";
  const discountRowText =
    order.discount > 0
      ? `\nBundle savings: -${formatCurrency(order.discount)}`
      : "";

  const address = order.shippingAddress;
  const addressLines = [
    address.name,
    address.line1,
    address.line2,
    `${address.city}, ${address.state} ${address.postalCode}`,
    address.country,
  ].filter((line): line is string => Boolean(line));
  const addressHtml = addressLines.map((line) => escapeHtml(line)).join("<br>");
  const addressText = addressLines.join("\n");

  const stockHtml =
    stockNotes.length > 0
      ? `
                <h2 style="font-family: Georgia, serif; font-size: 16px; color:${INK}; margin: 32px 0 8px;">Stock</h2>
                <div style="font-family: Arial, sans-serif; font-size: 14px; color:${INK}; line-height: 1.6; background-color:${CREAM}; border-radius: 8px; padding: 12px 16px;">
                  ${stockNotes.map((note) => `<p style="margin: 4px 0;">${escapeHtml(note)}</p>`).join("")}
                </div>`
      : "";
  const stockText =
    stockNotes.length > 0 ? `\nStock:\n${stockNotes.join("\n")}\n` : "";

  const emailHtml = order.customer.email
    ? `<a href="mailto:${escapeHtml(order.customer.email)}" style="color:${BRAND_GREEN};">${escapeHtml(order.customer.email)}</a>`
    : NOT_PROVIDED;
  const phoneHtml = order.customer.phone
    ? escapeHtml(order.customer.phone)
    : NOT_PROVIDED;

  const html = `<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:${CREAM}; font-family: Georgia, 'Times New Roman', serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${CREAM}; padding: 32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius: 16px; overflow: hidden;">
            <tr>
              <td style="background-color:${BRAND_GREEN}; padding: 32px 40px; text-align:center;">
                <span style="font-family: Georgia, serif; font-size: 22px; color:${CREAM}; letter-spacing: 0.5px;">Awele Wellness</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 40px;">
                <p style="font-family: Arial, sans-serif; font-size: 15px; color:${INK_MUTED}; margin: 0 0 8px;">${dateLabel}</p>
                <h1 style="font-family: Georgia, serif; font-size: 24px; color:${INK}; margin: 0 0 8px;">New order received</h1>
                <p style="font-family: Arial, sans-serif; font-size: 15px; color:${INK_MUTED}; margin: 0 0 24px;">${formatCurrency(order.total)} &middot; ${barLabel} &middot; paid with ${escapeHtml(order.paymentMethodLabel)}</p>

                <h2 style="font-family: Georgia, serif; font-size: 16px; color:${INK}; margin: 0 0 8px;">Customer</h2>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color:${INK}; line-height: 1.6; margin: 0 0 24px;">
                  ${escapeHtml(customerName)}<br>
                  ${emailHtml}<br>
                  ${phoneHtml}
                </p>

                <h2 style="font-family: Georgia, serif; font-size: 16px; color:${INK}; margin: 0 0 8px;">Items to pack</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif;">
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; margin-top: 16px;">
                  <tr>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px;">Subtotal</td>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px; text-align:right;">${formatCurrency(order.subtotal)}</td>
                  </tr>${discountRowHtml}
                  <tr>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px;">Shipping</td>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px; text-align:right;">${formatCurrency(order.shipping)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0; color:${INK}; font-size: 16px; font-weight: bold; border-top: 1px solid ${BORDER};">Total</td>
                    <td style="padding: 12px 0 0; color:${INK}; font-size: 16px; font-weight: bold; text-align:right; border-top: 1px solid ${BORDER};">${formatCurrency(order.total)}</td>
                  </tr>
                </table>${stockHtml}

                <h2 style="font-family: Georgia, serif; font-size: 16px; color:${INK}; margin: 32px 0 8px;">Ship to</h2>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color:${INK}; line-height: 1.6; margin: 0 0 24px;">${addressHtml}</p>

                <p style="font-family: Arial, sans-serif; font-size: 13px; color:${INK_MUTED}; margin: 0;">Order reference: ${escapeHtml(order.reference)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `New order received - ${dateLabel}

${formatCurrency(order.total)} - ${barLabel} - paid with ${order.paymentMethodLabel}

Customer:
${customerName}
${order.customer.email ?? NOT_PROVIDED}
${order.customer.phone ?? NOT_PROVIDED}

Items to pack:
${itemsText}

Subtotal: ${formatCurrency(order.subtotal)}${discountRowText}
Shipping: ${formatCurrency(order.shipping)}
Total: ${formatCurrency(order.total)}
${stockText}
Ship to:
${addressText}

Order reference: ${order.reference}`;

  return {
    subject: `New order from ${customerName} — ${formatCurrency(order.total)}`,
    html,
    text,
  };
}
