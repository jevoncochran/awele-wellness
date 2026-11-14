"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/admin/actions";
import { inputClassName } from "@/components/checkout/formStyles";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          autoFocus
          className={inputClassName}
        />
      </div>

      <p aria-live="polite" className="min-h-5 text-sm text-red-700">
        {state.error}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-brand-700 px-8 py-3.5 text-sm font-semibold text-cream transition-colors hover:bg-brand-800 disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
