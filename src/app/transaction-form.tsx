"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import type { Category } from "@/db/schema";
import { colorVar } from "@/lib/colors";

import { addTransaction } from "./actions";
import { EMPTY_FORM_STATE } from "./form-state";

const FIELD_CLASS =
  "w-full rounded-md border border-black/15 bg-white px-3 py-2.5 text-base outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--accent)] dark:border-white/20 dark:bg-white/5";

export function TransactionForm({
  categories,
  defaultDate,
}: {
  categories: Category[];
  defaultDate: string;
}) {
  const [state, formAction] = useActionState(addTransaction, EMPTY_FORM_STATE);

  // 登録に成功するたび key が変わり、入力欄が初期状態に作り直される。
  // 失敗時は key が変わらないので、入力した内容はそのまま残る。
  return (
    <Fields
      key={state.savedAt ?? 0}
      action={formAction}
      error={state.error}
      categories={categories}
      defaultDate={defaultDate}
    />
  );
}

function Fields({
  action,
  error,
  categories,
  defaultDate,
}: {
  action: (formData: FormData) => void;
  error: string | null;
  categories: Category[];
  defaultDate: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">金額</span>
        <div className="relative">
          <input
            type="number"
            name="amountYen"
            min={1}
            step={1}
            inputMode="numeric"
            placeholder="0"
            required
            autoFocus
            className={`${FIELD_CLASS} pr-9 text-right text-xl tabular-nums`}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-black/40 dark:text-white/40">
            円
          </span>
        </div>
      </label>

      <fieldset className="flex flex-col gap-1.5 text-sm">
        <legend className="mb-1.5 font-medium">カテゴリ</legend>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((category, index) => (
            <label
              key={category.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-black/15 px-3 py-2.5 text-sm transition has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-wash)] dark:border-white/20"
            >
              <input
                type="radio"
                name="categoryId"
                value={category.id}
                defaultChecked={index === 0}
                required
                className="sr-only"
              />
              <span
                aria-hidden
                className="size-3 shrink-0 rounded-full"
                style={{ backgroundColor: colorVar(category.color) }}
              />
              {category.name}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">日付</span>
        <input
          type="date"
          name="occurredOn"
          defaultValue={defaultDate}
          required
          className={FIELD_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">
          メモ <span className="font-normal text-black/40 dark:text-white/40">(任意)</span>
        </span>
        <input type="text" name="memo" maxLength={100} className={FIELD_CLASS} />
      </label>

      {error ? (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
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
      {pending ? "登録中…" : "記録する"}
    </button>
  );
}
