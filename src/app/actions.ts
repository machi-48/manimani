"use server";

import { revalidatePath } from "next/cache";

import {
  clearMonthBudget,
  createTransaction,
  deleteTransaction,
  setDefaultBudget,
  setMonthBudget,
} from "@/db/queries";
import { isValidMonth } from "@/lib/month";

import type { FormState } from "./form-state";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function addTransaction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const occurredOn = String(formData.get("occurredOn") ?? "");
  const rawAmount = String(formData.get("amountYen") ?? "");
  const rawCategoryId = String(formData.get("categoryId") ?? "");
  const memo = String(formData.get("memo") ?? "").trim();

  if (!DATE_PATTERN.test(occurredOn)) {
    return { error: "日付を入力してください。", savedAt: null };
  }

  // 円は整数で保持するので、小数や全角が混ざった入力はここで弾く
  const amountYen = Number(rawAmount);
  if (!Number.isInteger(amountYen) || amountYen <= 0) {
    return { error: "金額は1円以上の整数で入力してください。", savedAt: null };
  }

  const categoryId = Number(rawCategoryId);
  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    return { error: "カテゴリを選んでください。", savedAt: null };
  }

  await createTransaction({
    occurredOn,
    // 生活費の集計が目的なので、記録するのは支出だけ。
    // 収入を扱えるようスキーマ側には kind を残してある。
    kind: "expense",
    amountYen,
    categoryId,
    memo: memo || null,
  });

  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}

export async function saveBudget(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const month = String(formData.get("month") ?? "");
  if (!isValidMonth(month)) {
    return { error: "月が正しくありません。", savedAt: null };
  }

  const amountYen = Number(String(formData.get("amountYen") ?? ""));
  if (!Number.isInteger(amountYen) || amountYen < 0) {
    return { error: "生活費は0円以上の整数で入力してください。", savedAt: null };
  }

  if (String(formData.get("scope")) === "default") {
    // 既定額を変えたら、この月の上書きは外して既定額に追従させる
    await setDefaultBudget(amountYen);
    await clearMonthBudget(month);
  } else {
    await setMonthBudget(month, amountYen);
  }

  revalidatePath("/");
  return { error: null, savedAt: Date.now() };
}

export async function removeTransaction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) return;

  await deleteTransaction(id);
  revalidatePath("/");
}
