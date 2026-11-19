"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { isRemoved, type UnavailableItem } from "@/lib/purchase-limits";

type Result = { key: string; issues: UnavailableItem[] };

// Asks the server whether anything in the cart is sold out or short, whenever
// the cart changes (and when `enabled` turns on, e.g. the drawer opening).
// If the check can't run, there are simply no issues to show; the payment
// endpoint is what actually enforces stock.
export function useCartAvailability(enabled: boolean) {
  const { items, removeItem, updateQuantity } = useCart();
  const [result, setResult] = useState<Result>({ key: "", issues: [] });
  const [refreshCount, setRefreshCount] = useState(0);

  const key = JSON.stringify(
    items.map(({ slug, quantity }) => ({ slug, quantity })),
  );

  useEffect(() => {
    if (!enabled || key === "[]") return;

    let cancelled = false;
    fetch("/api/cart-availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: JSON.parse(key) }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setResult({ key, issues: data.unavailable ?? [] });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [key, enabled, refreshCount]);

  // An answer about an older version of the cart is ignored.
  const issues = enabled && result.key === key ? result.issues : [];

  // Removes sold-out soaps and lowers short ones to what's left.
  function fixCart() {
    for (const issue of issues) {
      if (isRemoved(issue)) {
        removeItem(issue.slug);
      } else {
        updateQuantity(issue.slug, issue.available);
      }
    }
  }

  return {
    issues,
    fixCart,
    refresh: () => setRefreshCount((count) => count + 1),
  };
}
