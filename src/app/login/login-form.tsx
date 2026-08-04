"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { EMPTY_FORM_STATE } from "../form-state";
import { login } from "./actions";

export function LoginForm() {
  const [state, action] = useActionState(login, EMPTY_FORM_STATE);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">パスワード</span>
        <input
          type="password"
          name="password"
          required
          autoFocus
          autoComplete="current-password"
          className="w-full rounded-lg border border-black/15 px-3 py-2.5 text-base outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--accent)] dark:border-white/20"
        />
      </label>

      {state.error ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--accent-solid)] px-4 py-3 text-base font-medium text-[var(--accent-on-solid)] transition hover:bg-[var(--accent-solid-hover)] disabled:opacity-50"
    >
      {pending ? "確認中…" : "ログイン"}
    </button>
  );
}
