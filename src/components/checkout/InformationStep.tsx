"use client";

import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";
import { inputClassName } from "@/components/checkout/formStyles";
import { US_STATES } from "@/lib/us-states";
import type { ContactAndShippingInfo } from "@/components/checkout/CheckoutView";

export default function InformationStep({
  info,
  onChange,
  onSubmit,
}: {
  info: ContactAndShippingInfo;
  onChange: (patch: Partial<ContactAndShippingInfo>) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <section>
        <h2 className="text-lg font-semibold text-ink">Contact</h2>
        <input
          type="email"
          required
          placeholder="Email"
          value={info.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={`mt-4 ${inputClassName}`}
        />
        <label className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={info.emailOptIn}
            onChange={(e) => onChange({ emailOptIn: e.target.checked })}
            className="accent-brand-700"
          />
          Email me with news and offers
        </label>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-ink">Shipping address</h2>
        <div className="mt-4 space-y-3">
          <select defaultValue="United States" className={inputClassName}>
            <option>United States</option>
          </select>

          <div className="grid grid-cols-2 gap-3">
            <input
              required
              placeholder="First name"
              value={info.firstName}
              onChange={(e) => onChange({ firstName: e.target.value })}
              className={inputClassName}
            />
            <input
              required
              placeholder="Last name"
              value={info.lastName}
              onChange={(e) => onChange({ lastName: e.target.value })}
              className={inputClassName}
            />
          </div>

          <input
            required
            placeholder="Address"
            value={info.address}
            onChange={(e) => onChange({ address: e.target.value })}
            className={inputClassName}
          />

          <input
            placeholder="Apartment, suite, etc. (optional)"
            value={info.apartment}
            onChange={(e) => onChange({ apartment: e.target.value })}
            className={inputClassName}
          />

          <div className="grid grid-cols-3 gap-3">
            <input
              required
              placeholder="City"
              value={info.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className={inputClassName}
            />
            <select
              required
              value={info.state}
              onChange={(e) => onChange({ state: e.target.value })}
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
              value={info.zip}
              onChange={(e) => onChange({ zip: e.target.value })}
              className={inputClassName}
            />
          </div>

          <input
            type="tel"
            placeholder="Phone"
            value={info.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            className={inputClassName}
          />

          <label className="flex items-center gap-2 text-sm text-ink-muted">
            <input
              type="checkbox"
              checked={info.textOptIn}
              onChange={(e) => onChange({ textOptIn: e.target.checked })}
              className="accent-brand-700"
            />
            Text me with news and offers
          </label>
        </div>
      </section>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/shop"
          className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted transition-colors hover:text-brand-700"
        >
          <ArrowRightIcon className="size-4 rotate-180" />
          Return to cart
        </Link>
        <button
          type="submit"
          className="rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800"
        >
          Continue to Shipping
        </button>
      </div>
    </form>
  );
}
