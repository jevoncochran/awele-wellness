"use client";

import { useActionState, useState } from "react";
import { login, type LoginState } from "@/lib/admin-actions";
import { inputClassName } from "@/components/checkout/formStyles";
import { EyeIcon, EyeOffIcon } from "@/components/icons";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-ink"
        >
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            autoFocus
            className={inputClassName}
            // Leaves room for the show/hide button.
            style={{ paddingRight: "3rem" }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((visible) => !visible)}
            // Keeps the cursor in the field when the button is clicked.
            onMouseDown={(event) => event.preventDefault()}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-lg text-ink-muted transition-colors hover:text-brand-700 focus-visible:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
          >
            {showPassword ? (
              <EyeOffIcon className="size-5" />
            ) : (
              <EyeIcon className="size-5" />
            )}
          </button>
        </div>
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
