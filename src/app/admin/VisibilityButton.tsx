"use client";

import { startTransition, useActionState } from "react";
import {
  setProductVisibility,
  type ProductActionState,
} from "@/app/admin/actions";

const initialState: ProductActionState = { status: "idle" };

// Hide / Show button for one soap. It applies at once (no Save needed) and
// is a plain button, not a form, so it can sit inside the stock form without
// submitting the quantities. Hiding asks first, because it removes the soap
// from the shop straight away.
export default function VisibilityButton({
  slug,
  name,
  hidden,
}: {
  slug: string;
  name: string;
  hidden: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    setProductVisibility,
    initialState,
  );

  function handleClick() {
    if (
      !hidden &&
      !window.confirm(
        `Hide ${name}? Customers won't see it in the shop, and it will be flagged in any cart that still has it.`,
      )
    ) {
      return;
    }
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("hidden", hidden ? "false" : "true");
    startTransition(() => formAction(formData));
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={`rounded-full border px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60 ${
          hidden
            ? "border-brand-700 bg-brand-700 text-cream hover:bg-brand-800"
            : "border-brand-700/30 text-brand-700 hover:bg-brand-100"
        }`}
      >
        {pending ? "Saving…" : hidden ? "Show in shop" : "Hide from shop"}
      </button>
      {state.status === "error" && (
        <p role="alert" className="max-w-[16rem] text-right text-xs font-medium text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
