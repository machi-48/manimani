"use client";

import { useActionState, useState } from "react";

import type { ColorSlot } from "@/db/schema";

import { EMPTY_FORM_STATE } from "../form-state";
import { editCategory, removeCategory } from "./actions";
import { ColorPicker } from "./color-picker";

export type CategoryRowData = {
  id: number;
  name: string;
  color: ColorSlot;
  usageCount: number;
};

export function CategoryRow({ category }: { category: CategoryRowData }) {
  const [editState, edit, editing] = useActionState(editCategory, EMPTY_FORM_STATE);
  const [deleteState, remove, removing] = useActionState(
    removeCategory,
    EMPTY_FORM_STATE,
  );

  const [name, setName] = useState(category.name);
  const [color, setColor] = useState<ColorSlot>(category.color);

  // 保存が終わると props が更新後の値に変わるので、dirty は自然に false に戻る
  const dirty = name !== category.name || color !== category.color;
  const inUse = category.usageCount > 0;
  const error = editState.error ?? deleteState.error;

  return (
    <li className="flex flex-col gap-1.5 py-2">
      <div className="flex items-center gap-2">
        <form action={edit} className="flex min-w-0 flex-1 items-center gap-2">
          <input type="hidden" name="id" value={category.id} />
          <input type="hidden" name="color" value={color} />
          <ColorPicker value={color} onChange={setColor} targetName={category.name} />
          <input
            type="text"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={20}
            required
            aria-label="カテゴリ名"
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-2.5 text-base outline-none focus:border-transparent focus:ring-2 focus:ring-[var(--accent)]"
          />
          <span className="shrink-0 text-xs tabular-nums text-black/40 dark:text-white/40">
            {category.usageCount}件
          </span>
          <button
            type="submit"
            disabled={!dirty || editing}
            className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-[var(--accent)] transition enabled:hover:bg-[var(--accent-wash)] disabled:opacity-0"
          >
            {editing ? "保存中…" : "保存"}
          </button>
        </form>

        <form action={remove} className="shrink-0">
          <input type="hidden" name="id" value={category.id} />
          <button
            type="submit"
            disabled={inUse || removing}
            title={
              inUse
                ? `${category.usageCount}件の明細で使われているため削除できません`
                : `${category.name}を削除`
            }
            className="grid size-9 place-items-center rounded-lg text-sm text-black/40 transition enabled:hover:bg-rose-500/10 enabled:hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-25 dark:text-white/40 dark:enabled:hover:text-rose-400"
          >
            ×
          </button>
        </form>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {error}
        </p>
      ) : null}
    </li>
  );
}
