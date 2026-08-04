"use server";

import { revalidatePath } from "next/cache";

import {
  countTransactionsForCategory,
  createCategory,
  deleteCategory,
  findCategoryByName,
  nextSortOrder,
  updateCategory,
} from "@/db/queries";
import { COLORS, type ColorSlot } from "@/db/schema";

import type { FormState } from "../form-state";

const MAX_NAME_LENGTH = 20;

type Parsed = { name: string; color: ColorSlot };

function parseNameAndColor(formData: FormData): Parsed | string {
  const name = String(formData.get("name") ?? "").trim();
  const color = String(formData.get("color") ?? "");

  if (name.length === 0) return "カテゴリ名を入力してください。";
  if (name.length > MAX_NAME_LENGTH) {
    return `カテゴリ名は${MAX_NAME_LENGTH}文字以内にしてください。`;
  }
  if (!COLORS.includes(color as ColorSlot)) return "色を選んでください。";

  return { name, color: color as ColorSlot };
}

function revalidate() {
  revalidatePath("/categories");
  revalidatePath("/");
}

export async function addCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = parseNameAndColor(formData);
  if (typeof parsed === "string") return { error: parsed, savedAt: null };

  if (await findCategoryByName(parsed.name)) {
    return { error: `「${parsed.name}」は既にあります。`, savedAt: null };
  }

  // 生活費の集計が目的なので、扱うのは支出のカテゴリだけ
  await createCategory({
    ...parsed,
    kind: "expense",
    sortOrder: await nextSortOrder("expense"),
  });

  revalidate();
  return { error: null, savedAt: Date.now() };
}

export async function editCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "カテゴリが見つかりません。", savedAt: null };
  }

  const parsed = parseNameAndColor(formData);
  if (typeof parsed === "string") return { error: parsed, savedAt: null };

  const duplicate = await findCategoryByName(parsed.name);
  if (duplicate && duplicate.id !== id) {
    return { error: `「${parsed.name}」は既にあります。`, savedAt: null };
  }

  await updateCategory(id, parsed);

  revalidate();
  return { error: null, savedAt: Date.now() };
}

export async function removeCategory(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { error: "カテゴリが見つかりません。", savedAt: null };
  }

  // 使用中のカテゴリを消すと外部キー制約で失敗する。
  // その前に件数を見て、何が起きているか分かるメッセージを返す。
  const usageCount = await countTransactionsForCategory(id);
  if (usageCount > 0) {
    return {
      error: `${usageCount}件の明細で使われているため削除できません。先に明細のカテゴリを変えてください。`,
      savedAt: null,
    };
  }

  await deleteCategory(id);

  revalidate();
  return { error: null, savedAt: Date.now() };
}
