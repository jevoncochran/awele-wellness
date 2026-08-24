"use client";

import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { resolveCartLines, useCart } from "@/components/cart/CartProvider";
import { LeafIcon, ShoppingBagIcon, XIcon } from "@/components/icons";

export default function CartDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { items, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const lines = resolveCartLines(items);

  const subtotal = lines.reduce(
    (sum, { item, product }) => sum + product.price * item.quantity,
    0,
  );

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-ink/50 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Cart"
        className={`fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-cream shadow-xl transition-transform duration-300 ease-in-out sm:w-[420px] ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-brand-700/10 px-6 py-5">
          <h2 className="font-serif text-xl text-ink">Your Cart</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-brand-100 hover:text-brand-700"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
              <ShoppingBagIcon className="size-6" />
            </span>
            <p className="text-ink-muted">Your cart is empty.</p>
            <Link
              href="/shop"
              onClick={onClose}
              className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6">
              {lines.map(({ item, product }) => (
                <li
                  key={product.slug}
                  className="flex gap-4 border-b border-brand-700/10 py-6 first:pt-6 last:border-b-0"
                >
                  <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-brand-100">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div
                        className={`flex size-full items-center justify-center bg-gradient-to-br ${product.gradient}`}
                      >
                        <LeafIcon className="size-5 text-brand-700" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/shop/${product.slug}`}
                          onClick={onClose}
                          className="font-serif text-base text-ink hover:text-brand-700"
                        >
                          {product.name}
                        </Link>
                        <p className="text-sm text-ink-muted">
                          ${product.price.toFixed(2)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(product.slug)}
                        aria-label={`Remove ${product.name}`}
                        className="text-ink-muted transition-colors hover:text-brand-700"
                      >
                        <XIcon className="size-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-brand-700/20">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(product.slug, item.quantity - 1)
                          }
                          aria-label={`Decrease quantity of ${product.name}`}
                          className="flex size-8 items-center justify-center text-ink transition-colors hover:text-brand-700"
                        >
                          &minus;
                        </button>
                        <span className="w-6 text-center text-sm font-semibold text-ink">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(product.slug, item.quantity + 1)
                          }
                          aria-label={`Increase quantity of ${product.name}`}
                          className="flex size-8 items-center justify-center text-ink transition-colors hover:text-brand-700"
                        >
                          +
                        </button>
                      </div>
                      <p className="font-semibold text-ink">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-brand-700/10 px-6 py-6">
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold text-ink">Subtotal</span>
                <span className="font-semibold text-ink">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                Shipping &amp; taxes calculated at checkout.
              </p>
              <Link
                href="/checkout"
                onClick={onClose}
                className="mt-4 block w-full rounded-full bg-brand-700 px-8 py-3.5 text-center text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
              >
                Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );
}
