export type OrderConfirmationEmailData = {
  customerName: string;
  orderReference: string;
  orderDate: Date;
  items: { name: string; quantity: number; price: number }[];
  subtotal: number;
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

const BRAND_GREEN = "#3e4a2c";
const CREAM = "#fbf7ee";
const INK = "#2b2a22";
const INK_MUTED = "#6b6a5c";
const BORDER = "#e4e0d3";

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildOrderConfirmationEmail(
  data: OrderConfirmationEmailData,
): { subject: string; html: string; text: string } {
  const dateLabel = data.orderDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const itemRows = data.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 14px;">
            ${escapeHtml(item.name)} &times; ${item.quantity}
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid ${BORDER}; color: ${INK}; font-size: 14px; text-align: right;">
            ${formatCurrency(item.price * item.quantity)}
          </td>
        </tr>`,
    )
    .join("");

  const itemsText = data.items
    .map(
      (item) =>
        `- ${item.name} x${item.quantity}: ${formatCurrency(item.price * item.quantity)}`,
    )
    .join("\n");

  const addressLines = [
    data.shippingAddress.name,
    data.shippingAddress.line1,
    data.shippingAddress.line2,
    `${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.postalCode}`,
    data.shippingAddress.country,
  ].filter((line): line is string => Boolean(line));

  const addressHtml = addressLines.map((line) => escapeHtml(line)).join("<br>");
  const addressText = addressLines.join("\n");

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
                <p style="font-family: Arial, sans-serif; font-size: 15px; color:${INK_MUTED}; margin: 0 0 8px;">Thank you, ${escapeHtml(data.customerName)}!</p>
                <h1 style="font-family: Georgia, serif; font-size: 24px; color:${INK}; margin: 0 0 24px;">Your order is confirmed</h1>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif;">
                  ${itemRows}
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family: Arial, sans-serif; margin-top: 16px;">
                  <tr>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px;">Subtotal</td>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px; text-align:right;">${formatCurrency(data.subtotal)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px;">Shipping</td>
                    <td style="padding: 4px 0; color:${INK_MUTED}; font-size: 14px; text-align:right;">${formatCurrency(data.shipping)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0 0; color:${INK}; font-size: 16px; font-weight: bold; border-top: 1px solid ${BORDER};">Total</td>
                    <td style="padding: 12px 0 0; color:${INK}; font-size: 16px; font-weight: bold; text-align:right; border-top: 1px solid ${BORDER};">${formatCurrency(data.total)}</td>
                  </tr>
                </table>

                <p style="font-family: Arial, sans-serif; font-size: 13px; color:${INK_MUTED}; margin: 24px 0 4px;">Paid with ${escapeHtml(data.paymentMethodLabel)}</p>
                <p style="font-family: Arial, sans-serif; font-size: 13px; color:${INK_MUTED}; margin: 0 0 24px;">Order reference: ${escapeHtml(data.orderReference)} &middot; ${dateLabel}</p>

                <h2 style="font-family: Georgia, serif; font-size: 16px; color:${INK}; margin: 24px 0 8px;">Shipping to</h2>
                <p style="font-family: Arial, sans-serif; font-size: 14px; color:${INK}; line-height: 1.6; margin: 0;">${addressHtml}</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:${CREAM}; padding: 24px 40px; text-align:center;">
                <p style="font-family: Arial, sans-serif; font-size: 12px; color:${INK_MUTED}; margin: 0;">Made with care in Oakland, California.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Thank you, ${data.customerName}!

Your Awele Wellness order is confirmed.

${itemsText}

Subtotal: ${formatCurrency(data.subtotal)}
Shipping: ${formatCurrency(data.shipping)}
Total: ${formatCurrency(data.total)}

Paid with ${data.paymentMethodLabel}
Order reference: ${data.orderReference} · ${dateLabel}

Shipping to:
${addressText}

Made with care in Oakland, California.`;

  return {
    subject: "Your Awele Wellness Order Confirmation",
    html,
    text,
  };
}
