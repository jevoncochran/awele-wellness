"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { saveStockChanges, type SaveStockState } from "@/app/admin/actions";
import VisibilityButton from "@/app/admin/VisibilityButton";
import { inputClassName } from "@/components/checkout/formStyles";
import { LeafIcon } from "@/components/icons";

export type StockRow = {
  slug: string;
  name: string;
  image?: string;
  gradient: string;
  // null means "not tracked" (sold without a limit); 0 means sold out.
  quantity: number | null;
  // Hidden from the shop (stock can still be edited).
  hidden: boolean;
};

type Draft = {
  quantity: string;
  // What the box held before "Sold out" was ticked, so unticking restores it.
  restore: string;
};

const initialState: SaveStockState = { status: "idle" };

function savedQuantityText(row: StockRow): string {
  return row.quantity === null ? "" : String(row.quantity);
}

function toDraft(row: StockRow): Draft {
  return { quantity: savedQuantityText(row), restore: "" };
}

function StatusBadge({ row }: { row: StockRow }) {
  if (row.quantity !== null && row.quantity <= 0) {
    return (
      <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
        Sold out
      </span>
    );
  }
  if (row.quantity === null) {
    return (
      <span className="rounded-full bg-ink-muted/15 px-2.5 py-0.5 text-xs font-semibold text-ink-muted">
        Not tracked
      </span>
    );
  }
  return (
    <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
      In stock &middot; {row.quantity} left
    </span>
  );
}

// The save status lives out here so it survives the editor below remounting
// with fresh saved values after each save.
export default function SoapList({ rows }: { rows: StockRow[] }) {
  const [state, formAction, pending] = useActionState(saveStockChanges, initialState);

  return (
    <StockEditor
      // Start over only when a saved quantity (or the set of soaps) changes.
      // Hiding or showing a soap must not wipe quantities typed but not yet saved.
      key={JSON.stringify(rows.map((row) => [row.slug, row.quantity]))}
      rows={rows}
      state={state}
      formAction={formAction}
      pending={pending}
    />
  );
}

function StockEditor({
  rows,
  state,
  formAction,
  pending,
}: {
  rows: StockRow[];
  state: SaveStockState;
  formAction: (formData: FormData) => void;
  pending: boolean;
}) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(rows.map((row) => [row.slug, toDraft(row)])),
  );

  const isDirty = (row: StockRow) => {
    return drafts[row.slug].quantity.trim() !== savedQuantityText(row);
  };
  const dirtyCount = rows.filter(isDirty).length;
  // A "Saved" message goes stale as soon as the owner starts editing again.
  const showMessage = state.message && (dirtyCount === 0 || state.status === "error");

  function update(slug: string, patch: Partial<Draft>) {
    setDrafts((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } }));
  }

  // "Sold out" is a shortcut for a quantity of 0: ticking it fills in 0, and
  // unticking puts back whatever the box held before (blank = not tracked).
  function toggleSoldOut(slug: string, soldOut: boolean) {
    const draft = drafts[slug];
    if (soldOut) {
      update(slug, {
        quantity: "0",
        restore: draft.quantity.trim() === "0" ? draft.restore : draft.quantity,
      });
    } else {
      update(slug, { quantity: draft.restore, restore: "" });
    }
  }

  // React 19 clears a <form action> after it runs, which would wipe the
  // owner's edits from view if the save fails validation. Submitting by hand
  // keeps what they typed; the page remounts with saved values on success.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit}>
      <ul className="divide-y divide-brand-700/10 rounded-2xl bg-white shadow-sm">
        {rows.map((row) => {
          const draft = drafts[row.slug];
          const dirty = isDirty(row);
          return (
            <li
              key={row.slug}
              className="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-4"
            >
              <input type="hidden" name={`original-${row.slug}`} value={savedQuantityText(row)} />

              <div className="flex min-w-0 flex-1 basis-56 items-center gap-4">
                <div
                  className={`relative size-14 shrink-0 overflow-hidden rounded-lg bg-brand-100 ${
                    row.hidden ? "opacity-50" : ""
                  }`}
                >
                  {row.image ? (
                    <Image src={row.image} alt="" fill sizes="56px" className="object-cover" />
                  ) : (
                    <div className={`flex size-full items-center justify-center bg-gradient-to-br ${row.gradient}`}>
                      <LeafIcon className="size-5 text-brand-700" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-serif text-base text-ink">{row.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusBadge row={row} />
                    {row.hidden && (
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                        Hidden from shop
                      </span>
                    )}
                    {dirty && (
                      <span className="text-xs font-semibold text-amber-700">Unsaved</span>
                    )}
                    {!row.hidden && (
                      <Link
                        href={`/shop/${row.slug}`}
                        className="text-xs font-medium text-brand-700 underline decoration-brand-700/40 underline-offset-4 hover:text-brand-800"
                      >
                        View in shop
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <label className="flex items-center gap-2 text-sm text-ink-muted">
                  <span className="sr-only sm:not-sr-only">Quantity</span>
                  <span className="block w-40 shrink-0">
                    <input
                      name={`quantity-${row.slug}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={9999}
                      step={1}
                      placeholder="Not tracked"
                      value={draft.quantity}
                      onChange={(event) => update(row.slug, { quantity: event.target.value })}
                      aria-label={`${row.name} quantity`}
                      className={inputClassName}
                    />
                  </span>
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={draft.quantity.trim() === "0"}
                    onChange={(event) => toggleSoldOut(row.slug, event.target.checked)}
                    className="size-4 accent-brand-700"
                  />
                  Sold out
                </label>
                <Link
                  href={`/admin/products/${row.slug}`}
                  className="rounded-full border border-brand-700/30 px-5 py-2 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100"
                >
                  Edit
                </Link>
                <VisibilityButton slug={row.slug} name={row.name} hidden={row.hidden} />
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-sm text-ink-muted">
        A quantity of 0 means sold out, and ticking &ldquo;Sold out&rdquo; sets
        it to 0. Leave the quantity blank to sell without a limit. Quantity
        changes need &ldquo;Save&rdquo;; hiding or showing a soap happens
        immediately, and nothing is ever deleted.
      </p>

      <div className="sticky bottom-0 -mx-6 mt-6 flex flex-wrap items-center gap-4 border-t border-brand-700/10 bg-cream/95 px-6 py-4 backdrop-blur lg:-mx-8 lg:px-8">
        <button
          type="submit"
          disabled={pending || dirtyCount === 0}
          className="rounded-full bg-brand-700 px-8 py-3 text-sm font-semibold text-cream transition-colors hover:bg-brand-800 disabled:opacity-50"
        >
          {pending
            ? "Saving…"
            : dirtyCount > 0
              ? `Save ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`
              : "Save changes"}
        </button>
        <p
          aria-live="polite"
          className={`text-sm ${state.status === "error" ? "font-medium text-red-700" : "text-brand-800"}`}
        >
          {showMessage ? state.message : ""}
        </p>
      </div>
    </form>
  );
}
