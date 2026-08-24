"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { LeafIcon, ShoppingBagIcon } from "@/components/icons";

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const { clearCart } = useCart();
  const redirectStatus = searchParams.get("redirect_status");
  const succeeded = redirectStatus === "succeeded";

  useEffect(() => {
    if (succeeded) {
      clearCart();
    }
  }, [succeeded, clearCart]);

  if (succeeded) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <LeafIcon className="size-6" />
        </span>
        <h1 className="font-serif text-3xl text-ink">Thank you!</h1>
        <p className="max-w-sm text-ink-muted">
          Your order has been placed. A confirmation will be sent to the
          email you provided.
        </p>
        <Link
          href="/shop"
          className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-24 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
        <ShoppingBagIcon className="size-6" />
      </span>
      <h1 className="font-serif text-3xl text-ink">Payment wasn&apos;t completed</h1>
      <p className="max-w-sm text-ink-muted">
        Something went wrong and your payment wasn&apos;t completed. Your
        cart is still saved.
      </p>
      <Link
        href="/checkout"
        className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
      >
        Return to Checkout
      </Link>
    </main>
  );
}
