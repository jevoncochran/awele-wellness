export const BRAND_GREEN = "#3e4a2c";
export const CREAM = "#fbf7ee";
export const INK = "#2b2a22";
export const INK_MUTED = "#6b6a5c";
export const BORDER = "#e4e0d3";

export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
