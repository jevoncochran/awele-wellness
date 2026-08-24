"use client";

import { ArrowRightIcon } from "@/components/icons";
import { changeLinkClassName } from "@/components/checkout/formStyles";
import type { ContactAndShippingInfo } from "@/components/checkout/CheckoutView";

export default function ShippingStep({
  info,
  itemCount,
  ratePerBar,
  shippingCost,
  onChangeInfo,
  onContinue,
}: {
  info: ContactAndShippingInfo;
  itemCount: number;
  ratePerBar: number;
  shippingCost: number;
  onChangeInfo: () => void;
  onContinue: () => void;
}) {
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
      </div>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Shipping method</h2>
        <div className="mt-4 flex items-center justify-between rounded-lg border border-brand-700 bg-brand-100/40 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">
              Standard Shipping
            </p>
            <p className="text-xs text-ink-muted">
              ${ratePerBar.toFixed(2)} per bar &times; {itemCount} bar
              {itemCount === 1 ? "" : "s"}
            </p>
          </div>
          <p className="text-sm font-semibold text-ink">
            ${shippingCost.toFixed(2)}
          </p>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={onChangeInfo}
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-700"
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          Return to Information
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}
