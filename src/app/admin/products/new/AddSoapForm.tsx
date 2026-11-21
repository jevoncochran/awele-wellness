"use client";

import {
  startTransition,
  useActionState,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { createProduct, type ProductFormState } from "@/app/admin/actions";
import PhotoField from "@/app/admin/PhotoField";
import { inputClassName } from "@/components/checkout/formStyles";
import { LIMITS } from "@/lib/product-input";

const initialState: ProductFormState = { status: "idle" };

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
      <div className="mt-2">{children}</div>
      {error && (
        <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export default function AddSoapForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialState);
  const [uploading, setUploading] = useState(false);
  const errors = state.fieldErrors ?? {};

  // React 19 clears a <form action> after it runs, which would wipe everything
  // the owner typed if a field needs fixing. Submitting by hand keeps it.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-6 rounded-2xl bg-white p-6 shadow-sm">
      <Field label="Name" htmlFor="name" error={errors.name}>
        <input
          id="name"
          name="name"
          type="text"
          required
          maxLength={LIMITS.nameMax}
          placeholder="e.g. Rose Clay"
          className={inputClassName}
        />
      </Field>

      <Field
        label="Tagline"
        htmlFor="tagline"
        hint="A few words shown under the name, e.g. “Soothing & Gentle”."
        error={errors.tagline}
      >
        <input
          id="tagline"
          name="tagline"
          type="text"
          required
          maxLength={LIMITS.taglineMax}
          className={inputClassName}
        />
      </Field>

      <Field label="Description" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={LIMITS.descriptionMax}
          className={inputClassName}
        />
      </Field>

      <Field
        label="Ingredients"
        htmlFor="ingredients"
        hint="Separate with commas, e.g. Goat Milk, Oatmeal, Honey."
        error={errors.ingredients}
      >
        <input id="ingredients" name="ingredients" type="text" required className={inputClassName} />
      </Field>

      <div>
        <p className="text-sm font-semibold text-ink">Photo</p>
        <p className="mt-1 text-xs text-ink-muted">
          Optional, but shoppers like to see the soap. Without one, a colored
          placeholder is shown.
        </p>
        <div className="mt-3">
          <PhotoField name="image" onUploadingChange={setUploading} />
        </div>
        {errors.image && (
          <p role="alert" className="mt-1.5 text-sm font-medium text-red-700">
            {errors.image}
          </p>
        )}
      </div>

      <Field
        label="Starting stock"
        htmlFor="stock"
        hint="How many you have right now. Leave blank to sell without a limit; you can change it any time in the list."
        error={errors.stock}
      >
        <span className="block w-40">
          <input
            id="stock"
            name="stock"
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            step={1}
            placeholder="Not tracked"
            className={inputClassName}
          />
        </span>
      </Field>

      <p className="text-sm text-ink-muted">
        The price is the same as every other soap, and the new soap appears in
        the shop as soon as you save.
      </p>

      <div className="flex flex-wrap items-center gap-4 border-t border-brand-700/10 pt-6">
        <button
          type="submit"
          disabled={pending || uploading}
          className="rounded-full bg-brand-700 px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : uploading ? "Uploading photo…" : "Add soap"}
        </button>
        <Link
          href="/admin"
          className="text-sm font-semibold text-ink-muted transition-colors hover:text-brand-700"
        >
          Cancel
        </Link>
      </div>

      <p
        role={state.status === "error" ? "alert" : undefined}
        aria-live="polite"
        className="text-sm font-medium text-red-700"
      >
        {state.status === "error" ? state.message : ""}
      </p>
    </form>
  );
}
