"use client";

import { useActionState, useId, useRef } from "react";

import { formatYen } from "@/lib/format";

import { saveBudget } from "./actions";
import { EMPTY_FORM_STATE } from "./form-state";

const DOTTED_LINE =
  "repeating-linear-gradient(to bottom, var(--foreground) 0 3px, transparent 3px 6px)";

export function BudgetCard({
  month,
  monthLabel,
  budgetYen,
  defaultYen,
  isOverride,
  spentYen,
  entryCount,
  elapsedDays,
  daysInMonth,
}: {
  month: string;
  monthLabel: string;
  budgetYen: number;
  defaultYen: number;
  isOverride: boolean;
  spentYen: number;
  entryCount: number;
  /** その月の何日目か。今月以外は null。今日の日付はサーバー側で決めて渡す。 */
  elapsedDays: number | null;
  daysInMonth: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, save] = useActionState(saveBudget, EMPTY_FORM_STATE);

  const remaining = budgetYen - spentYen;
  const over = remaining < 0;
  const ratio = budgetYen > 0 ? Math.min(spentYen / budgetYen, 1) : 0;

  // 生活費をその月の日数で割った1日あたりの額 × 経過日数 = 今日までの目安
  const paceRatio = elapsedDays === null ? null : elapsedDays / daysInMonth;
  const paceYen = paceRatio === null ? null : Math.round(budgetYen * paceRatio);
  const diffYen = paceYen === null ? null : paceYen - spentYen;

  return (
    <>
      {budgetYen === 0 ? (
        <div className="text-center">
          <p className="text-sm text-black/50 dark:text-white/50">
            {monthLabel}に使える生活費がまだ設定されていません。
          </p>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            className="mt-3 rounded-lg bg-[var(--accent-solid)] px-4 py-2.5 text-sm font-medium text-[var(--accent-on-solid)] transition hover:bg-[var(--accent-solid-hover)]"
          >
            生活費を設定する
          </button>
        </div>
      ) : (
        <div>
          <p className="text-center">
            <span className="block text-xs text-black/50 dark:text-white/50">
              {monthLabel}の{over ? "オーバー" : "残り"}
            </span>
            <span
              className="mt-1 block text-4xl font-semibold tabular-nums"
              style={over ? { color: "var(--status-critical)" } : undefined}
            >
              {formatYen(Math.abs(remaining))}
            </span>
          </p>

          <div className="relative mt-4">
            <div
              className="h-3 overflow-hidden rounded-full bg-black/8 dark:bg-white/10"
              role="img"
              aria-label={
                paceYen === null
                  ? `生活費${formatYen(budgetYen)}のうち${formatYen(spentYen)}を使用`
                  : `生活費${formatYen(budgetYen)}のうち${formatYen(spentYen)}を使用。今日までの目安は${formatYen(paceYen)}`
              }
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(ratio * 100, spentYen > 0 ? 2 : 0)}%`,
                  backgroundColor: over
                    ? "var(--status-critical)"
                    : "color-mix(in oklab, var(--foreground) 70%, transparent)",
                }}
              />
            </div>

            {/*
              今日までの目安の位置に立てる縦の点線。
              バーの色とも空きの色とも紛れないよう、背景色の隙間を挟んでから点線を引く。
            */}
            {paceRatio !== null ? (
              <span
                aria-hidden
                className="absolute -top-1 -bottom-1 w-1 -translate-x-1/2 rounded-full"
                style={{
                  left: `${paceRatio * 100}%`,
                  backgroundColor: "var(--background)",
                }}
              >
                <span
                  className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2"
                  style={{ backgroundImage: DOTTED_LINE }}
                />
              </span>
            ) : null}
          </div>

          {paceYen !== null ? (
            <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-xs text-black/50 dark:text-white/50">
              <span
                aria-hidden
                className="inline-block h-3 w-0.5 shrink-0"
                style={{ backgroundImage: DOTTED_LINE }}
              />
              {/*
                「5/31日」と書くと日付（5月31日）に読めてしまう。
                明細欄では同じ形が実際に日付を指しているので、必ず日付と読めない形にする。
              */}
              <span className="tabular-nums">
                今日までの目安 {formatYen(paceYen)}（{daysInMonth}日中{elapsedDays}日目）
              </span>
              {diffYen !== null && diffYen !== 0 ? (
                <span className="tabular-nums">
                  ・目安より {formatYen(Math.abs(diffYen))}
                  {diffYen > 0 ? "少ない" : "多い"}
                </span>
              ) : null}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-3 text-xs text-black/50 dark:text-white/50">
            <span className="tabular-nums">
              生活費 {formatYen(budgetYen)} / 使った {formatYen(spentYen)}
              <span className="ml-2">{entryCount}件</span>
            </span>
            <button
              type="button"
              onClick={() => dialogRef.current?.showModal()}
              className="rounded px-2 py-1 text-[var(--accent)] transition hover:bg-[var(--accent-wash)]"
            >
              生活費を変える
            </button>
          </div>
        </div>
      )}

      <BudgetDialog
        ref={dialogRef}
        month={month}
        monthLabel={monthLabel}
        budgetYen={budgetYen}
        defaultYen={defaultYen}
        isOverride={isOverride}
        action={save}
        error={state.error}
        savedAt={state.savedAt}
      />
    </>
  );
}

function BudgetDialog({
  ref,
  month,
  monthLabel,
  budgetYen,
  defaultYen,
  isOverride,
  action,
  error,
  savedAt,
}: {
  ref: React.RefObject<HTMLDialogElement | null>;
  month: string;
  monthLabel: string;
  budgetYen: number;
  defaultYen: number;
  isOverride: boolean;
  action: (formData: FormData) => void;
  error: string | null;
  savedAt: number | null;
}) {
  const titleId = useId();

  // 保存に成功するたび key が変わり、入力欄が保存後の値で作り直される
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClick={(event) => {
        if (event.target === ref.current) ref.current?.close();
      }}
      className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-2xl border border-black/10 bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-black/50 sm:mb-auto sm:w-96 sm:rounded-2xl dark:border-white/15"
    >
      <form
        key={savedAt ?? 0}
        action={(formData) => {
          action(formData);
          ref.current?.close();
        }}
        className="flex flex-col gap-4 p-5"
      >
        <h2 id={titleId} className="text-sm font-semibold">
          生活費の設定
        </h2>

        <input type="hidden" name="month" value={month} />

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">金額</span>
          <div className="relative">
            <input
              type="number"
              name="amountYen"
              min={0}
              step={1}
              inputMode="numeric"
              defaultValue={budgetYen || ""}
              placeholder="0"
              required
              className="w-full rounded-lg border border-black/15 px-3 py-2.5 pr-9 text-right text-xl tabular-nums outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--accent)] dark:border-white/20"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-black/40 dark:text-white/40">
              円
            </span>
          </div>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1.5 text-sm font-medium">適用する範囲</legend>
          <ScopeOption
            value="default"
            defaultChecked={!isOverride}
            title="毎月の生活費にする"
            note={
              defaultYen > 0
                ? `今は毎月 ${formatYen(defaultYen)}。以降の月にも使われます`
                : "以降の月にも同じ額が使われます"
            }
          />
          <ScopeOption
            value="month"
            defaultChecked={isOverride}
            title={`${monthLabel}だけ変える`}
            note="この月だけ別の額にします"
          />
        </fieldset>

        {error ? (
          <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
            {error}
          </p>
        ) : null}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex-1 rounded-lg border border-black/15 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            やめる
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg bg-[var(--accent-solid)] py-2.5 text-sm font-medium text-[var(--accent-on-solid)] transition hover:bg-[var(--accent-solid-hover)]"
          >
            保存する
          </button>
        </div>
      </form>
    </dialog>
  );
}

function ScopeOption({
  value,
  defaultChecked,
  title,
  note,
}: {
  value: string;
  defaultChecked: boolean;
  title: string;
  note: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/15 px-3 py-2.5 transition has-checked:border-[var(--accent)] has-checked:bg-[var(--accent-wash)] dark:border-white/20">
      <input
        type="radio"
        name="scope"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 accent-[var(--accent)]"
      />
      <span className="text-sm">
        {title}
        <span className="mt-0.5 block text-xs text-black/50 dark:text-white/50">
          {note}
        </span>
      </span>
    </label>
  );
}
