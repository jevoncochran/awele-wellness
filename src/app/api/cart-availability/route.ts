import { NextRequest, NextResponse } from "next/server";
import { findUnavailable, getInventory } from "@/lib/inventory";
import { products } from "@/lib/products";

// Tells the cart and checkout screens which of the customer's own items can't
// be fulfilled. It only answers about the items it is given, so it doesn't
// publish the shop's stock levels.
export async function POST(request: NextRequest) {
  let body: { items?: { slug?: unknown; quantity?: unknown }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const totals = new Map<string, number>();
  for (const item of Array.isArray(body.items) ? body.items : []) {
    const quantity = Number(item.quantity);
    if (
      !products.some((product) => product.slug === item.slug) ||
      typeof item.slug !== "string" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      continue;
    }
    totals.set(item.slug, (totals.get(item.slug) ?? 0) + quantity);
  }
  const requested = [...totals].map(([slug, quantity]) => ({ slug, quantity }));

  // If stock can't be read, say nothing is wrong: the payment endpoint makes the
  // real decision, and the same fail-open choice applies there.
  try {
    const unavailable = findUnavailable(await getInventory(), requested);
    return NextResponse.json({ unavailable, checked: true });
  } catch (err) {
    console.error("[cart-availability] Could not check stock:", err);
    return NextResponse.json({ unavailable: [], checked: false });
  }
}
