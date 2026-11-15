"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { ArrowRightIcon, HeartIcon, LeafIcon, TruckIcon } from "@/components/icons";
import BundleDealsBanner from "@/components/shared/BundleDealsBanner";
import { LOW_STOCK_THRESHOLD } from "@/lib/checkout-config";
import type { Product } from "@/lib/products";
import { remainingToAdd } from "@/lib/purchase-limits";

const trustPoints = [
  { icon: LeafIcon, label: "Natural Ingredients" },
  { icon: HeartIcon, label: "Small Batches" },
  { icon: LeafIcon, label: "Made in Oakland" },
];

const disabledButtonClasses =
  "disabled:cursor-not-allowed disabled:bg-ink-muted/20 disabled:text-ink-muted disabled:hover:bg-ink-muted/20";

export default function ProductDetails({
  product,
  soldOut,
  available,
}: {
  product: Product;
  soldOut: boolean;
  // Tracked stock left; null means the owner hasn't set a limit.
  available: number | null;
}) {
  const { items, addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  // Don't let the cart hold more than exists, counting what's already in it.
  const inCart = items.find((item) => item.slug === product.slug)?.quantity ?? 0;
  const canAdd = soldOut ? 0 : remainingToAdd(available, inCart);
  const shownQuantity = Math.min(quantity, Math.max(1, canAdd));
  const lowStock =
    !soldOut && available !== null && available <= LOW_STOCK_THRESHOLD;

  useEffect(() => {
    if (!justAdded) return;
    const timeout = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(timeout);
  }, [justAdded]);

  return (
    <div>
      <Link
        href="/shop"
        className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-700"
      >
        <ArrowRightIcon className="size-4 rotate-180" />
        Back to Shop
      </Link>

      <p className="mt-6 flex items-center gap-2 text-xs font-semibold tracking-widest text-brand-700 uppercase">
        <LeafIcon className="size-4" />
        Awele Wellness
      </p>
      <h1 className="mt-2 font-serif text-4xl text-ink sm:text-5xl">
        {product.name}
      </h1>
      <p className="mt-2 text-lg text-brand-700">{product.tagline}</p>

      <p className="mt-4 text-2xl font-semibold text-ink">
        ${product.price.toFixed(2)}
      </p>
      <BundleDealsBanner variant="compact" className="mt-4 max-w-lg" />

      <p className="mt-6 max-w-lg leading-relaxed text-ink-muted">
        {product.description}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {product.ingredients.map((ingredient) => (
          <span
            key={ingredient}
            className="rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-800"
          >
            {ingredient}
          </span>
        ))}
      </div>

      {lowStock && (
        <p className="mt-6 text-sm font-semibold text-amber-700">
          Only {available} left
        </p>
      )}

      {soldOut ? (
        <div className="mt-8">
          <button
            type="button"
            disabled
            className={`w-full rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream sm:max-w-xs ${disabledButtonClasses}`}
          >
            Sold Out
          </button>
          <p className="mt-3 text-sm text-ink-muted">
            This soap is currently sold out.
          </p>
        </div>
      ) : (
        <div
          className={`${lowStock ? "mt-3" : "mt-8"} flex flex-wrap items-center gap-4`}
        >
          <div
            className={`flex items-center rounded-full border border-brand-700/20 ${
              canAdd === 0 ? "opacity-50" : ""
            }`}
          >
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, shownQuantity - 1))}
              disabled={shownQuantity <= 1}
              className="flex size-11 items-center justify-center text-lg text-ink transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink"
              aria-label="Decrease quantity"
            >
              &minus;
            </button>
            <span className="w-8 text-center text-sm font-semibold text-ink">
              {shownQuantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity(Math.min(canAdd, shownQuantity + 1))}
              disabled={shownQuantity >= canAdd}
              className="flex size-11 items-center justify-center text-lg text-ink transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-ink"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>

          <button
            type="button"
            disabled={canAdd === 0}
            onClick={() => {
              addItem(product.slug, shownQuantity);
              setJustAdded(true);
            }}
            className={`min-w-[200px] flex-1 rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800 ${disabledButtonClasses}`}
          >
            {justAdded
              ? "Added to Cart ✓"
              : canAdd === 0
                ? "All available are in your cart"
                : "Add to Cart"}
          </button>
        </div>
      )}

      <ul className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 border-t border-brand-700/10 pt-6 text-sm text-ink-muted">
        {trustPoints.map(({ icon: Icon, label }, index) => (
          <li key={label} className="flex items-center gap-3">
            {index > 0 && (
              <span
                className="size-1 rounded-full bg-ink-muted/50"
                aria-hidden="true"
              />
            )}
            <span className="flex items-center gap-2">
              <Icon className="size-4 text-brand-700" />
              {label}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
        <TruckIcon className="size-4 text-brand-700" />
        Ships from Oakland, CA
      </p>
    </div>
  );
}
