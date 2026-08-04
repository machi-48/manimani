"use client";

import { useId, useRef } from "react";

import { COLORS, type ColorSlot } from "@/db/schema";
import { COLOR_LABELS, colorVar } from "@/lib/colors";

/**
 * 色を1つ選ぶ。スマホでの操作を前提にしているので、
 * 小さなスウォッチを並べるのではなくモーダル（画面下のシート）で選ばせる。
 * 自由な色ではなく固定の8枠から選ばせるのは、どの色を選んでも
 * 背景とのコントラストと色覚多様性での識別性が検証済みだから。
 */
export function ColorPicker({
  value,
  onChange,
  targetName,
}: {
  value: ColorSlot;
  onChange: (color: ColorSlot) => void;
  /** 何の色を選んでいるのかを読み上げに含めるための名前。 */
  targetName: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        aria-label={`${targetName}の色: ${COLOR_LABELS[value]}。変更する`}
        className="grid size-11 shrink-0 place-items-center rounded-full transition hover:bg-black/5 dark:hover:bg-white/10"
      >
        <span
          aria-hidden
          className="size-6 rounded-full ring-1 ring-black/10 dark:ring-white/15"
          style={{ backgroundColor: colorVar(value) }}
        />
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        // 背景（dialog 自身）をタップしたら閉じる
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="mx-auto mt-auto mb-0 w-full max-w-none rounded-t-2xl border border-black/10 bg-[var(--background)] p-0 text-[var(--foreground)] backdrop:bg-black/50 sm:mb-auto sm:w-80 sm:rounded-2xl dark:border-white/15"
      >
        <div className="p-5">
          <h2 id={titleId} className="text-sm font-semibold">
            {targetName}の色
          </h2>

          <div className="mt-4 grid grid-cols-4 gap-2">
            {COLORS.map((slot) => (
              <button
                key={slot}
                type="button"
                // 色名は画面に出さないが、読み上げ用の名前は必要なので aria-label で補う
                aria-label={COLOR_LABELS[slot]}
                aria-pressed={value === slot}
                onClick={() => {
                  onChange(slot);
                  close();
                }}
                className={`grid place-items-center rounded-xl py-3 transition ${
                  value === slot
                    ? "bg-black/8 dark:bg-white/15"
                    : "hover:bg-black/5 dark:hover:bg-white/10"
                }`}
              >
                <span
                  aria-hidden
                  className={`size-11 rounded-full ${
                    value === slot
                      ? "ring-2 ring-black/50 ring-offset-2 ring-offset-[var(--background)] dark:ring-white/60"
                      : "ring-1 ring-black/10 dark:ring-white/15"
                  }`}
                  style={{ backgroundColor: colorVar(slot) }}
                />
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={close}
            className="mt-4 w-full rounded-lg border border-black/15 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            閉じる
          </button>
        </div>
      </dialog>
    </>
  );
}
