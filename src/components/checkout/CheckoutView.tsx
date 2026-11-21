"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AvailabilityNotice from "@/components/cart/AvailabilityNotice";
import { resolveCartLines, useCart } from "@/components/cart/CartProvider";
import { useCatalog } from "@/components/cart/CatalogProvider";
import { useCartAvailability } from "@/components/cart/useCartAvailability";
import { LeafIcon, ShoppingBagIcon } from "@/components/icons";
import { SHIPPING_RATE_PER_BAR } from "@/lib/checkout-config";
import { priceCart, pricedLinesFromCart } from "@/lib/pricing";
import { applyAvailability, isRemoved } from "@/lib/purchase-limits";
import InformationStep from "@/components/checkout/InformationStep";
import ShippingStep from "@/components/checkout/ShippingStep";
import PaymentStep from "@/components/checkout/PaymentStep";

export type ContactAndShippingInfo = {
  email: string;
  emailOptIn: boolean;
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  textOptIn: boolean;
};

export type BillingAddress = {
  firstName: string;
  lastName: string;
  address: string;
  apartment: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY_INFO: ContactAndShippingInfo = {
  email: "",
  emailOptIn: true,
  firstName: "",
  lastName: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  textOptIn: false,
};

const EMPTY_BILLING_ADDRESS: BillingAddress = {
  firstName: "",
  lastName: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zip: "",
};

type Step = "information" | "shipping" | "payment";

const STEP_ORDER: Step[] = ["information", "shipping", "payment"];
const STEP_LABELS: Record<Step, string> = {
  information: "Information",
  shipping: "Shipping",
  payment: "Payment",
};

export default function CheckoutView() {
  const { items } = useCart();
  const catalog = useCatalog();
  const lines = resolveCartLines(items, catalog);

  // Anything sold out or short is flagged, kept out of the totals, and blocks
  // the checkout steps until the customer updates their cart.
  const { issues, fixCart, refresh } = useCartAvailability(true);
  const issueBySlug = new Map(issues.map((issue) => [issue.slug, issue]));

  const [step, setStep] = useState<Step>("information");
  const [info, setInfo] = useState<ContactAndShippingInfo>(EMPTY_INFO);
  const [billingSameAsShipping, setBillingSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState<BillingAddress>(
    EMPTY_BILLING_ADDRESS,
  );

  const pricing = priceCart(
    pricedLinesFromCart(
      resolveCartLines(applyAvailability(items, issues), catalog),
    ),
  );
  const subtotal = pricing.subtotalCents / 100;
  const discount = pricing.discountCents / 100;
  const itemCount = pricing.barCount;
  const shipping = pricing.shippingCents / 100;
  const total =
    step === "information" ? subtotal - discount : subtotal - discount + shipping;

  if (lines.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center gap-4 bg-cream px-6 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-brand-100 text-brand-700">
          <ShoppingBagIcon className="size-6" />
        </span>
        <p className="text-ink-muted">Your cart is empty.</p>
        <Link
          href="/shop"
          className="rounded-full bg-brand-700 px-6 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
        >
          Continue Shopping
        </Link>
      </main>
    );
  }

  function goToStep(nextStep: Step) {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const currentStepIndex = STEP_ORDER.indexOf(step);

  return (
    <main className="flex flex-1 flex-col bg-cream">
      <div className="border-b border-brand-700/10 px-6 py-4 lg:px-8">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 text-sm">
          <Link href="/shop" className="text-brand-700 hover:text-brand-800">
            Cart
          </Link>
          {STEP_ORDER.map((s, index) => (
            <span key={s} className="flex items-center gap-2">
              <span className="text-ink-muted">/</span>
              {s === step ? (
                <span className="font-semibold text-ink">
                  {STEP_LABELS[s]}
                </span>
              ) : index < currentStepIndex ? (
                <button
                  type="button"
                  onClick={() => goToStep(s)}
                  className="text-brand-700 hover:text-brand-800"
                >
                  {STEP_LABELS[s]}
                </button>
              ) : (
                <span className="text-ink-muted">{STEP_LABELS[s]}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-12 px-6 py-10 lg:grid-cols-2 lg:px-8 lg:py-14">
        {issues.length > 0 ? (
          <div>
            <AvailabilityNotice issues={issues} onFix={fixCart} />
          </div>
        ) : (
          <>
        {step === "information" && (
          <InformationStep
            info={info}
            onChange={(patch) => setInfo((prev) => ({ ...prev, ...patch }))}
            onSubmit={() => goToStep("shipping")}
          />
        )}
        {step === "shipping" && (
          <ShippingStep
            info={info}
            itemCount={itemCount}
            ratePerBar={SHIPPING_RATE_PER_BAR}
            shippingCost={shipping}
            onChangeInfo={() => goToStep("information")}
            onContinue={() => goToStep("payment")}
          />
        )}
        {step === "payment" && (
          <PaymentStep
            info={info}
            items={items}
            itemCount={itemCount}
            ratePerBar={SHIPPING_RATE_PER_BAR}
            shippingCost={shipping}
            billingSameAsShipping={billingSameAsShipping}
            onBillingSameAsShippingChange={setBillingSameAsShipping}
            billingAddress={billingAddress}
            onBillingAddressChange={(patch) =>
              setBillingAddress((prev) => ({ ...prev, ...patch }))
            }
            onChangeInfo={() => goToStep("information")}
            onChangeShipping={() => goToStep("shipping")}
            onStockConflict={refresh}
          />
        )}
          </>
        )}

        <div className="h-fit rounded-2xl bg-brand-100/40 p-6 lg:sticky lg:top-24 lg:p-8">
          <ul className="space-y-4">
            {lines.map(({ item, product }) => {
              const issue = issueBySlug.get(product.slug);
              const soldOut = issue ? isRemoved(issue) : false;
              const billableQuantity = !issue
                ? item.quantity
                : soldOut
                  ? 0
                  : Math.min(item.quantity, issue.available);

              return (
              <li key={product.slug} className="flex items-center gap-4">
                <div
                  className={`relative size-16 shrink-0 overflow-hidden rounded-lg bg-brand-100 ${
                    soldOut ? "opacity-50" : ""
                  }`}
                >
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  ) : (
                    <div
                      className={`flex size-full items-center justify-center bg-gradient-to-br ${product.gradient}`}
                    >
                      <LeafIcon className="size-4 text-brand-700" />
                    </div>
                  )}
                  <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-brand-700 text-[10px] font-bold text-cream">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">
                    {product.name}
                  </p>
                  <p className="text-xs text-ink-muted">{product.tagline}</p>
                  {issue && (
                    <p className="mt-0.5 text-xs font-semibold text-red-700">
                      {soldOut
                        ? issue.reason === "unavailable"
                          ? "No longer available"
                          : "Sold out"
                        : `Only ${issue.available} left`}
                    </p>
                  )}
                </div>
                <p
                  className={`text-sm font-semibold ${soldOut ? "text-ink-muted" : "text-ink"}`}
                >
                  {soldOut
                    ? "Not included"
                    : `$${(product.price * billableQuantity).toFixed(2)}`}
                </p>
              </li>
              );
            })}
          </ul>

          <div className="mt-6 space-y-2 border-t border-brand-700/10 pt-6 text-sm">
            <div className="flex justify-between text-ink-muted">
              <span>
                Subtotal &middot; {itemCount} item{itemCount === 1 ? "" : "s"}
              </span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between font-medium text-brand-700">
                <span>Bundle savings</span>
                <span>&minus;${discount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-ink-muted">
              <span>Shipping</span>
              <span>
                {step === "information"
                  ? "Calculated at next step"
                  : `$${shipping.toFixed(2)}`}
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-brand-700/10 pt-4">
            <span className="text-lg font-semibold text-ink">Total</span>
            <span className="text-lg font-semibold text-ink">
              ${total.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
