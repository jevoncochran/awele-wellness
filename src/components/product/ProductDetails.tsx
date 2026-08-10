"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, HeartIcon, LeafIcon, TruckIcon } from "@/components/icons";
import type { Product } from "@/lib/products";

const trustPoints = [
  { icon: LeafIcon, label: "Natural Ingredients" },
  { icon: HeartIcon, label: "Small Batches" },
  { icon: LeafIcon, label: "Made in Oakland" },
];

export default function ProductDetails({ product }: { product: Product }) {
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

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

      <div className="mt-8 flex flex-wrap items-center gap-4">
        <div className="flex items-center rounded-full border border-brand-700/20">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="flex size-11 items-center justify-center text-lg text-ink transition-colors hover:text-brand-700"
            aria-label="Decrease quantity"
          >
            &minus;
          </button>
          <span className="w-8 text-center text-sm font-semibold text-ink">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="flex size-11 items-center justify-center text-lg text-ink transition-colors hover:text-brand-700"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          type="button"
          onClick={() => setJustAdded(true)}
          className="min-w-[200px] flex-1 rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
        >
          {justAdded ? "Added to Cart ✓" : "Add to Cart"}
        </button>
      </div>

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
