import { NextRequest, NextResponse } from "next/server";
import { getCatalogFresh } from "@/lib/catalog";
import { findUnavailable, getInventory, type Inventory } from "@/lib/inventory";

const MAX_LINES = 200;

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

  // Soaps that aren't in the catalog are ignored further down.
  const totals = new Map<string, number>();
  const rawItems = Array.isArray(body.items) ? body.items.slice(0, MAX_LINES) : [];
  for (const item of rawItems) {
    const quantity = Number(item?.quantity);
    if (
      typeof item?.slug !== "string" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      continue;
    }
    totals.set(item.slug, (totals.get(item.slug) ?? 0) + quantity);
  }
  const requested = [...totals].map(([slug, quantity]) => ({ slug, quantity }));

  // If the catalog or stock can't be read, say nothing is wrong: the payment
  // endpoint makes the real decision, and the same fail-open choice applies
  // there.
  try {
    const catalog = await getCatalogFresh();
    let inventory: Inventory = {};
    let checked = true;
    try {
      inventory = await getInventory(catalog);
    } catch (err) {
      console.error("[cart-availability] Could not read stock:", err);
      checked = false;
    }
    const unavailable = findUnavailable(inventory, requested, catalog);
    return NextResponse.json({ unavailable, checked });
  } catch (err) {
    console.error("[cart-availability] Could not check stock:", err);
    return NextResponse.json({ unavailable: [], checked: false });
  }
}
