"use client";

import { useActionState, useState } from "react";

import type { ColorSlot } from "@/db/schema";

import { EMPTY_FORM_STATE } from "../form-state";
import { addCategory } from "./actions";
import { ColorPicker } from "./color-picker";

export function NewCategoryForm({ suggestedColor }: { suggestedColor: ColorSlot }) {
  const [state, add] = useActionState(addCategory, EMPTY_FORM_STATE);

  // 登録に成功するたびフォームを作り直して、入力欄と色の選択を初期状態に戻す
  return (
    <Fields
      key={state.savedAt ?? 0}
      action={add}
      error={state.error}
      suggestedColor={suggestedColor}
    />
  );
}

function Fields({
  action,
  error,
  suggestedColor,
}: {
  action: (formData: FormData) => void;
  error: string | null;
  suggestedColor: ColorSlot;
}) {
  const [color, setColor] = useState<ColorSlot>(suggestedColor);

  return (
    <form action={action} className="flex flex-col gap-2 pt-4">
      <input type="hidden" name="color" value={color} />
      <div className="flex items-center gap-2">
        <ColorPicker value={color} onChange={setColor} targetName="新しいカテゴリ" />
        <input
          type="text"
          name="name"
          maxLength={20}
          required
          placeholder="カテゴリを追加"
          aria-label="新しいカテゴリの名前"
          className="min-w-0 flex-1 rounded-lg border border-black/15 px-3 py-2.5 text-base outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--accent)] dark:border-white/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg border border-black/15 px-4 py-2.5 text-sm font-medium transition hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          追加
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
