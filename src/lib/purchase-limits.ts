import { MAX_QUANTITY_PER_ITEM } from "@/lib/checkout-config";

// How many of one soap a single order can hold. `available` is the tracked
// stock (null = untracked, so only the per-item cap applies).
export function purchaseLimit(available: number | null): number {
  if (available === null) return MAX_QUANTITY_PER_ITEM;
  return Math.min(MAX_QUANTITY_PER_ITEM, Math.max(0, available));
}

// How many more of a soap can still be added, given what's already in the cart.
export function remainingToAdd(
  available: number | null,
  inCart: number,
): number {
  return Math.max(0, purchaseLimit(available) - inCart);
}
