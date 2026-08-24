"use client";

import { useEffect, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowRightIcon, LockIcon } from "@/components/icons";
import { changeLinkClassName } from "@/components/checkout/formStyles";
import StripePaymentForm from "@/components/checkout/StripePaymentForm";
import type {
  BillingAddress,
  ContactAndShippingInfo,
} from "@/components/checkout/CheckoutView";
import type { CartItem } from "@/components/cart/CartProvider";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

export default function PaymentStep({
  info,
  items,
  itemCount,
  ratePerBar,
  shippingCost,
  billingSameAsShipping,
  onBillingSameAsShippingChange,
  billingAddress,
  onBillingAddressChange,
  onChangeInfo,
  onChangeShipping,
}: {
  info: ContactAndShippingInfo;
  items: CartItem[];
  itemCount: number;
  ratePerBar: number;
  shippingCost: number;
  billingSameAsShipping: boolean;
  onBillingSameAsShippingChange: (same: boolean) => void;
  billingAddress: BillingAddress;
  onBillingAddressChange: (patch: Partial<BillingAddress>) => void;
  onChangeInfo: () => void;
  onChangeShipping: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const error = stripePromise
    ? fetchError
    : "Stripe is not configured yet. Add your API keys to .env.local to enable payments.";

  useEffect(() => {
    if (!stripePromise) return;

    let cancelled = false;

    fetch("/api/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items,
        shipping: {
          name: `${info.firstName} ${info.lastName}`.trim(),
          phone: info.phone || undefined,
          address: {
            line1: info.address,
            line2: info.apartment || undefined,
            city: info.city,
            state: info.state,
            postal_code: info.zip,
            country: "US",
          },
        },
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setFetchError(
            data.error ?? "Could not start payment. Please try again.",
          );
          return;
        }
        setClientSecret(data.clientSecret);
      })
      .catch(() => {
        if (!cancelled) {
          setFetchError("Could not start payment. Please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
    // items are fixed for the lifetime of this step — re-fetching on every
    // keystroke elsewhere isn't needed, and refetching would create a new
    // PaymentIntent unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 border-b border-brand-700/10 pb-4">
          <div>
            <p className="text-sm text-ink-muted">Contact</p>
            <p className="mt-1 text-sm font-medium text-ink">{info.email}</p>
          </div>
          <button
            type="button"
            onClick={onChangeInfo}
            className={changeLinkClassName}
          >
            Change
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-brand-700/10 pb-4">
          <div>
            <p className="text-sm text-ink-muted">Ship to</p>
            <p className="mt-1 text-sm font-medium text-ink">
              {info.firstName} {info.lastName}
              <br />
              {info.address}
              {info.apartment && `, ${info.apartment}`}, {info.city}{" "}
              {info.state} {info.zip}, United States
            </p>
          </div>
          <button
            type="button"
            onClick={onChangeInfo}
            className={changeLinkClassName}
          >
            Change
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 border-b border-brand-700/10 pb-4">
          <div>
            <p className="text-sm text-ink-muted">Shipping</p>
            <p className="mt-1 text-sm font-medium text-ink">
              Standard Shipping &middot; ${shippingCost.toFixed(2)}{" "}
              <span className="text-ink-muted">
                (${ratePerBar.toFixed(2)} &times; {itemCount} bar
                {itemCount === 1 ? "" : "s"})
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onChangeShipping}
            className={changeLinkClassName}
          >
            Change
          </button>
        </div>
      </div>

      {clientSecret && stripePromise ? (
        <div className="mt-8">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: "stripe",
                variables: {
                  colorPrimary: "#3e4a2c",
                  colorText: "#2b2a22",
                  colorTextSecondary: "#6b6a5c",
                  colorBackground: "#ffffff",
                  borderRadius: "8px",
                  fontFamily: "Inter, sans-serif",
                },
              },
            }}
          >
            <StripePaymentForm
              shippingInfo={info}
              billingSameAsShipping={billingSameAsShipping}
              onBillingSameAsShippingChange={onBillingSameAsShippingChange}
              billingAddress={billingAddress}
              onBillingAddressChange={onBillingAddressChange}
              onChangeShipping={onChangeShipping}
            />
          </Elements>
        </div>
      ) : (
        <>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-ink">Payment</h2>
            <p className="text-sm text-ink-muted">
              All transactions are secure and encrypted.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-brand-700/30 bg-brand-100/30 px-6 py-10 text-center">
              {error ? (
                <>
                  <LockIcon className="size-6 text-brand-700" />
                  <p className="text-sm font-medium text-ink">{error}</p>
                </>
              ) : (
                <p className="text-sm text-ink-muted">
                  Loading payment form…
                </p>
              )}
            </div>
          </section>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={onChangeShipping}
              className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-700"
            >
              <ArrowRightIcon className="size-4 rotate-180" />
              Return to shipping
            </button>
          </div>
        </>
      )}
    </div>
  );
}
