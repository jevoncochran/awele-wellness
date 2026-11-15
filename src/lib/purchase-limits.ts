import { MAX_QUANTITY_PER_ITEM } from "@/lib/checkout-config";

// How many of one soap a single order can hold. `available` is the tracked
// stock (null = untracked, so only the per-item cap applies).
export function purchaseLimit(available: number | null): number {
  if (available === null) return MAX_QUANTITY_PER_ITEM;
  return Math.min(MAX_QUANTITY_PER_ITEM, Math.max(0, available));
}

export type UnavailableItem = {
  slug: string;
  name: string;
  reason: "sold_out" | "insufficient";
  // How many can still be ordered (0 when sold out).
  available: number;
};

// "Cool Spring Scrub is sold out" / "only 3 Tea Tree Mint are left".
export function describeUnavailable(problem: UnavailableItem): string {
  if (problem.reason === "sold_out") return `${problem.name} is sold out`;
  return `only ${problem.available} ${problem.name} ${problem.available === 1 ? "is" : "are"} left`;
}

// Plain-English explanation of why a cart can't be checked out, used by the
// payment endpoint.
export function unavailableMessage(problems: UnavailableItem[]): string {
  const parts = problems.map(describeUnavailable);
  return `Sorry, ${parts.join("; ")}. Please update your cart and try again.`;
}

// What the cart becomes once the problems are fixed: sold-out soaps drop out
// and short ones are reduced to what's left. Used both to price the cart
// honestly while problems are showing and to actually fix it.
export function applyAvailability<T extends { slug: string; quantity: number }>(
  items: T[],
  problems: Pick<UnavailableItem, "slug" | "reason" | "available">[],
): T[] {
  const bySlug = new Map(problems.map((problem) => [problem.slug, problem]));
  return items.flatMap((item) => {
    const problem = bySlug.get(item.slug);
    if (!problem) return [item];
    if (problem.reason === "sold_out" || problem.available <= 0) return [];
    return [{ ...item, quantity: Math.min(item.quantity, problem.available) }];
  });
}

// How many more of a soap can still be added, given what's already in the cart.
export function remainingToAdd(
  available: number | null,
  inCart: number,
): number {
  return Math.max(0, purchaseLimit(available) - inCart);
}
