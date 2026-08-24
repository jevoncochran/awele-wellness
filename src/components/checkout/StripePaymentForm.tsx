"use client";

import { useState } from "react";
import {
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { ArrowRightIcon } from "@/components/icons";
import { inputClassName } from "@/components/checkout/formStyles";
import { US_STATES } from "@/lib/us-states";
import type {
  BillingAddress,
  ContactAndShippingInfo,
} from "@/components/checkout/CheckoutView";

export default function StripePaymentForm({
  shippingInfo,
  billingSameAsShipping,
  onBillingSameAsShippingChange,
  billingAddress,
  onBillingAddressChange,
  onChangeShipping,
}: {
  shippingInfo: ContactAndShippingInfo;
  billingSameAsShipping: boolean;
  onBillingSameAsShippingChange: (same: boolean) => void;
  billingAddress: BillingAddress;
  onBillingAddressChange: (patch: Partial<BillingAddress>) => void;
  onChangeShipping: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const addressSource = billingSameAsShipping ? shippingInfo : billingAddress;
    const name = billingSameAsShipping
      ? `${shippingInfo.firstName} ${shippingInfo.lastName}`.trim()
      : `${billingAddress.firstName} ${billingAddress.lastName}`.trim();

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
        payment_method_data: {
          billing_details: {
            name,
            email: shippingInfo.email,
            address: {
              line1: addressSource.address,
              line2: addressSource.apartment || undefined,
              city: addressSource.city,
              state: addressSource.state,
              postal_code: addressSource.zip,
              country: "US",
            },
          },
        },
      },
    });

    // stripe.confirmPayment redirects on success; we only reach here on failure.
    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <section>
        <h2 className="text-lg font-semibold text-ink">Payment</h2>
        <p className="text-sm text-ink-muted">
          All transactions are secure and encrypted.
        </p>
        <div className="mt-4">
          <PaymentElement
            options={{
              fields: {
                billingDetails: { name: "never", email: "never", address: "never" },
              },
            }}
          />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Billing address</h2>
        <p className="text-sm text-ink-muted">
          Select the address that matches your payment method.
        </p>
        <div className="mt-4 space-y-2">
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-700/20 px-4 py-3 text-sm text-ink has-[:checked]:border-brand-700 has-[:checked]:bg-brand-100/40">
            <input
              type="radio"
              name="billing-address"
              checked={billingSameAsShipping}
              onChange={() => onBillingSameAsShippingChange(true)}
              className="accent-brand-700"
            />
            Same as shipping address
          </label>
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-brand-700/20 px-4 py-3 text-sm text-ink has-[:checked]:border-brand-700 has-[:checked]:bg-brand-100/40">
            <input
              type="radio"
              name="billing-address"
              checked={!billingSameAsShipping}
              onChange={() => onBillingSameAsShippingChange(false)}
              className="accent-brand-700"
            />
            Use a different billing address
          </label>
        </div>

        {!billingSameAsShipping && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                placeholder="First name"
                value={billingAddress.firstName}
                onChange={(e) =>
                  onBillingAddressChange({ firstName: e.target.value })
                }
                className={inputClassName}
              />
              <input
                required
                placeholder="Last name"
                value={billingAddress.lastName}
                onChange={(e) =>
                  onBillingAddressChange({ lastName: e.target.value })
                }
                className={inputClassName}
              />
            </div>

            <input
              required
              placeholder="Address"
              value={billingAddress.address}
              onChange={(e) =>
                onBillingAddressChange({ address: e.target.value })
              }
              className={inputClassName}
            />

            <input
              placeholder="Apartment, suite, etc. (optional)"
              value={billingAddress.apartment}
              onChange={(e) =>
                onBillingAddressChange({ apartment: e.target.value })
              }
              className={inputClassName}
            />

            <div className="grid grid-cols-3 gap-3">
              <input
                required
                placeholder="City"
                value={billingAddress.city}
                onChange={(e) =>
                  onBillingAddressChange({ city: e.target.value })
                }
                className={inputClassName}
              />
              <select
                required
                value={billingAddress.state}
                onChange={(e) =>
                  onBillingAddressChange({ state: e.target.value })
                }
                className={inputClassName}
              >
                <option value="">State</option>
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </select>
              <input
                required
                placeholder="ZIP code"
                value={billingAddress.zip}
                onChange={(e) =>
                  onBillingAddressChange({ zip: e.target.value })
                }
                className={inputClassName}
              />
            </div>
          </div>
        )}
      </section>

      {errorMessage && (
        <p className="mt-4 text-sm text-red-600">{errorMessage}</p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onChangeShipping}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-700"
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          Return to shipping
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || isSubmitting}
          className="rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Processing…" : "Pay Now"}
        </button>
      </div>
    </form>
  );
}
