import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// revalidatePath はリクエストの文脈が無いと動かないので差し替える。
// 検証したいのは入力の受け付け方と DB に入る内容なので、キャッシュ制御は対象外。
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addTransaction, removeTransaction, saveBudget } from "@/app/actions";
import { addCategory, editCategory, removeCategory } from "@/app/categories/actions";
import { EMPTY_FORM_STATE } from "@/app/form-state";
import {
  createTransaction,
  findCategoryByName,
  getMonthBudget,
  listCategories,
  listCategoriesWithUsage,
  listTransactionsByMonth,
  setDefaultBudget,
  setMonthBudget,
} from "@/db/queries";
import type { Category } from "@/db/schema";

import { migrateTestDb, resetTestDb, seedTestCategories } from "./helpers/db";

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
}

let food: Category;
let daily: Category;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  [food, daily] = await seedTestCategories();
});

describe("明細の登録", () => {
  const base = () => ({
    occurredOn: "2026-08-10",
    amountYen: "500",
    categoryId: String(food.id),
    memo: "",
  });

  it("正しい入力なら登録される", async () => {
    const state = await addTransaction(EMPTY_FORM_STATE, form(base()));

    expect(state.error).toBeNull();
    expect(state.savedAt).not.toBeNull();

    const rows = await listTransactionsByMonth("2026-08");
    expect(rows).toHaveLength(1);
    expect(rows[0].amountYen).toBe(500);
    // 生活費の集計しか扱わないので、常に支出として入る
    expect(rows[0].kind).toBe("expense");
  });

  it("空のメモは null として保存する", async () => {
    await addTransaction(EMPTY_FORM_STATE, form({ ...base(), memo: "   " }));
    const [row] = await listTransactionsByMonth("2026-08");
    expect(row.memo).toBeNull();
  });

  it("メモの前後の空白を落とす", async () => {
    await addTransaction(EMPTY_FORM_STATE, form({ ...base(), memo: "  スーパー  " }));
    const [row] = await listTransactionsByMonth("2026-08");
    expect(row.memo).toBe("スーパー");
  });

  it.each([
    ["日付が空", { occurredOn: "" }, "日付を入力してください。"],
    ["日付の形式違い", { occurredOn: "2026/08/10" }, "日付を入力してください。"],
    ["金額が空", { amountYen: "" }, "金額は1円以上の整数で入力してください。"],
    ["金額が0", { amountYen: "0" }, "金額は1円以上の整数で入力してください。"],
    ["金額が負", { amountYen: "-100" }, "金額は1円以上の整数で入力してください。"],
    ["金額が小数", { amountYen: "12.5" }, "金額は1円以上の整数で入力してください。"],
    ["金額が全角", { amountYen: "５００" }, "金額は1円以上の整数で入力してください。"],
    ["金額が文字", { amountYen: "abc" }, "金額は1円以上の整数で入力してください。"],
    ["カテゴリ未選択", { categoryId: "" }, "カテゴリを選んでください。"],
  ])("%s なら弾く", async (_label, override, message) => {
    const state = await addTransaction(EMPTY_FORM_STATE, form({ ...base(), ...override }));

    expect(state.error).toBe(message);
    expect(state.savedAt).toBeNull();
    expect(await listTransactionsByMonth("2026-08")).toEqual([]);
  });
});

describe("明細の削除", () => {
  it("指定した明細だけ消える", async () => {
    const a = await createTransaction({ occurredOn: "2026-08-01", amountYen: 100, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-02", amountYen: 200, kind: "expense", categoryId: food.id });

    await removeTransaction(form({ id: String(a.id) }));

    const rows = await listTransactionsByMonth("2026-08");
    expect(rows.map((r) => r.amountYen)).toEqual([200]);
  });

  it("壊れた id では何も起きない", async () => {
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 100, kind: "expense", categoryId: food.id });

    await removeTransaction(form({ id: "abc" }));
    await removeTransaction(form({ id: "-1" }));

    expect(await listTransactionsByMonth("2026-08")).toHaveLength(1);
  });
});

describe("生活費の設定", () => {
  it("その月だけの上書きとして保存できる", async () => {
    const state = await saveBudget(
      EMPTY_FORM_STATE,
      form({ month: "2026-08", amountYen: "80000", scope: "month" }),
    );

    expect(state.error).toBeNull();
    expect(await getMonthBudget("2026-08")).toEqual({
      amountYen: 80000,
      defaultYen: 0,
      isOverride: true,
    });
  });

  it("既定額として保存すると、その月の上書きは外れる", async () => {
    await setMonthBudget("2026-08", 50000);

    await saveBudget(
      EMPTY_FORM_STATE,
      form({ month: "2026-08", amountYen: "90000", scope: "default" }),
    );

    expect(await getMonthBudget("2026-08")).toEqual({
      amountYen: 90000,
      defaultYen: 90000,
      isOverride: false,
    });
  });

  it("既定額の変更は他の月の上書きを壊さない", async () => {
    await setDefaultBudget(80000);
    await setMonthBudget("2026-09", 50000);

    await saveBudget(
      EMPTY_FORM_STATE,
      form({ month: "2026-08", amountYen: "70000", scope: "default" }),
    );

    expect((await getMonthBudget("2026-09")).amountYen).toBe(50000);
  });

  it("0円を許す（未設定に戻す操作になる）", async () => {
    const state = await saveBudget(
      EMPTY_FORM_STATE,
      form({ month: "2026-08", amountYen: "0", scope: "default" }),
    );
    expect(state.error).toBeNull();
    expect((await getMonthBudget("2026-08")).amountYen).toBe(0);
  });

  it.each([
    ["月が不正", { month: "2026-13" }, "月が正しくありません。"],
    ["月が空", { month: "" }, "月が正しくありません。"],
    ["日付まで入っている", { month: "2026-08-01" }, "月が正しくありません。"],
    ["金額が負", { amountYen: "-1" }, "生活費は0円以上の整数で入力してください。"],
    ["金額が小数", { amountYen: "1000.5" }, "生活費は0円以上の整数で入力してください。"],
    ["金額が文字", { amountYen: "たくさん" }, "生活費は0円以上の整数で入力してください。"],
  ])("%s なら弾く", async (_label, override, message) => {
    const state = await saveBudget(
      EMPTY_FORM_STATE,
      form({ month: "2026-08", amountYen: "80000", scope: "default", ...override }),
    );

    expect(state.error).toBe(message);
    expect(await getMonthBudget("2026-08")).toMatchObject({ amountYen: 0 });
  });
});

describe("カテゴリの追加", () => {
  it("末尾の並び順で支出カテゴリとして追加される", async () => {
    const state = await addCategory(EMPTY_FORM_STATE, form({ name: "娯楽", color: "magenta" }));

    expect(state.error).toBeNull();
    const created = await findCategoryByName("娯楽");
    expect(created?.kind).toBe("expense");
    expect(created?.color).toBe("magenta");
    expect(created?.sortOrder).toBe(40);
  });

  it("名前の前後の空白を落とす", async () => {
    await addCategory(EMPTY_FORM_STATE, form({ name: "  娯楽  ", color: "blue" }));
    expect(await findCategoryByName("娯楽")).toBeDefined();
  });

  it.each([
    ["名前が空", { name: "" }, "カテゴリ名を入力してください。"],
    ["名前が空白だけ", { name: "   " }, "カテゴリ名を入力してください。"],
    ["名前が21文字", { name: "あ".repeat(21) }, "カテゴリ名は20文字以内にしてください。"],
    ["色が不正", { color: "chartreuse" }, "色を選んでください。"],
    ["色が空", { color: "" }, "色を選んでください。"],
  ])("%s なら弾く", async (_label, override, message) => {
    const before = (await listCategories()).length;
    const state = await addCategory(
      EMPTY_FORM_STATE,
      form({ name: "娯楽", color: "blue", ...override }),
    );

    expect(state.error).toBe(message);
    expect(await listCategories()).toHaveLength(before);
  });

  it("既にある名前は弾く", async () => {
    const state = await addCategory(EMPTY_FORM_STATE, form({ name: "食費", color: "blue" }));
    expect(state.error).toBe("「食費」は既にあります。");
  });

  it("ちょうど20文字は通る", async () => {
    const state = await addCategory(
      EMPTY_FORM_STATE,
      form({ name: "あ".repeat(20), color: "blue" }),
    );
    expect(state.error).toBeNull();
  });
});

describe("カテゴリの編集", () => {
  it("名前と色を変えられる", async () => {
    const state = await editCategory(
      EMPTY_FORM_STATE,
      form({ id: String(food.id), name: "食料品", color: "red" }),
    );

    expect(state.error).toBeNull();
    const updated = await findCategoryByName("食料品");
    expect(updated?.color).toBe("red");
  });

  it("自分自身の名前のまま保存できる", async () => {
    const state = await editCategory(
      EMPTY_FORM_STATE,
      form({ id: String(food.id), name: "食費", color: "red" }),
    );
    expect(state.error).toBeNull();
  });

  it("他のカテゴリと同じ名前にはできない", async () => {
    const state = await editCategory(
      EMPTY_FORM_STATE,
      form({ id: String(food.id), name: "日用品", color: "red" }),
    );

    expect(state.error).toBe("「日用品」は既にあります。");
    expect((await findCategoryByName("食費"))?.id).toBe(food.id);
  });

  it("存在しない id は弾く", async () => {
    const state = await editCategory(
      EMPTY_FORM_STATE,
      form({ id: "abc", name: "x", color: "red" }),
    );
    expect(state.error).toBe("カテゴリが見つかりません。");
  });
});

describe("カテゴリの削除", () => {
  it("使われていなければ削除できる", async () => {
    const state = await removeCategory(EMPTY_FORM_STATE, form({ id: String(daily.id) }));

    expect(state.error).toBeNull();
    expect(await findCategoryByName("日用品")).toBeUndefined();
  });

  it("使用中なら件数つきのメッセージで止める", async () => {
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 100, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-02", amountYen: 200, kind: "expense", categoryId: food.id });

    const state = await removeCategory(EMPTY_FORM_STATE, form({ id: String(food.id) }));

    expect(state.error).toBe(
      "2件の明細で使われているため削除できません。先に明細のカテゴリを変えてください。",
    );
    expect((await listCategoriesWithUsage()).map((c) => c.name)).toContain("食費");
  });

  it("存在しない id は弾く", async () => {
    const state = await removeCategory(EMPTY_FORM_STATE, form({ id: "0" }));
    expect(state.error).toBe("カテゴリが見つかりません。");
  });
});
