import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  clearMonthBudget,
  countTransactionsForCategory,
  createCategory,
  createTransaction,
  deleteCategory,
  deleteTransaction,
  findCategoryByName,
  getDefaultBudget,
  getMonthBudget,
  listCategories,
  listCategoriesWithUsage,
  listTransactionsByMonth,
  monthlyBalance,
  nextSortOrder,
  setDefaultBudget,
  setMonthBudget,
  summarizeByCategory,
  updateCategory,
} from "@/db/queries";
import type { Category } from "@/db/schema";

import { migrateTestDb, resetTestDb, seedTestCategories } from "./helpers/db";

let food: Category;
let daily: Category;
let dining: Category;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  await resetTestDb();
  [food, daily, dining] = await seedTestCategories();
});

describe("月による絞り込み", () => {
  beforeEach(async () => {
    // 8月の端と、その前後の月
    await createTransaction({ occurredOn: "2026-07-31", amountYen: 100, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 200, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-31", amountYen: 300, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-09-01", amountYen: 400, kind: "expense", categoryId: food.id });
  });

  it("月初と月末を取りこぼさず、前後の月を含めない", async () => {
    const rows = await listTransactionsByMonth("2026-08");
    expect(rows.map((r) => r.amountYen).sort()).toEqual([200, 300]);
  });

  it("31日ない月でも末日まで拾う", async () => {
    await createTransaction({ occurredOn: "2026-02-28", amountYen: 500, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-03-01", amountYen: 600, kind: "expense", categoryId: food.id });

    const rows = await listTransactionsByMonth("2026-02");
    expect(rows.map((r) => r.amountYen)).toEqual([500]);
  });

  it("うるう年の2月29日を拾う", async () => {
    await createTransaction({ occurredOn: "2024-02-29", amountYen: 700, kind: "expense", categoryId: food.id });
    const rows = await listTransactionsByMonth("2024-02");
    expect(rows.map((r) => r.amountYen)).toEqual([700]);
  });

  it("日付の新しい順に並ぶ", async () => {
    const rows = await listTransactionsByMonth("2026-08");
    expect(rows.map((r) => r.occurredOn)).toEqual(["2026-08-31", "2026-08-01"]);
  });

  it("カテゴリを一緒に返す", async () => {
    const [row] = await listTransactionsByMonth("2026-08");
    expect(row.category.name).toBe("食費");
    expect(row.category.color).toBe("orange");
  });
});

describe("カテゴリ別の集計", () => {
  beforeEach(async () => {
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 1000, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-02", amountYen: 500, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-03", amountYen: 3000, kind: "expense", categoryId: daily.id });
    await createTransaction({ occurredOn: "2026-07-15", amountYen: 9999, kind: "expense", categoryId: food.id });
  });

  it("カテゴリごとに合計と件数を出す", async () => {
    const rows = await summarizeByCategory("2026-08", "expense");
    expect(rows).toEqual([
      { categoryId: daily.id, categoryName: "日用品", categoryColor: "blue", totalYen: 3000, count: 1 },
      { categoryId: food.id, categoryName: "食費", categoryColor: "orange", totalYen: 1500, count: 2 },
    ]);
  });

  it("金額の多い順に並ぶ", async () => {
    const rows = await summarizeByCategory("2026-08", "expense");
    expect(rows.map((r) => r.totalYen)).toEqual([3000, 1500]);
  });

  it("使われていないカテゴリは出てこない", async () => {
    const rows = await summarizeByCategory("2026-08", "expense");
    expect(rows.map((r) => r.categoryName)).not.toContain("外食");
  });

  it("記録が無い月は空", async () => {
    expect(await summarizeByCategory("2026-06", "expense")).toEqual([]);
  });
});

describe("収支の合計", () => {
  it("支出と収入を分けて数え、記録が無くても0を返す", async () => {
    expect(await monthlyBalance("2026-08")).toEqual({
      incomeYen: 0,
      expenseYen: 0,
      balanceYen: 0,
    });

    await createTransaction({ occurredOn: "2026-08-01", amountYen: 1500, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-02", amountYen: 200000, kind: "income", categoryId: dining.id });

    expect(await monthlyBalance("2026-08")).toEqual({
      incomeYen: 200000,
      expenseYen: 1500,
      balanceYen: 198500,
    });
  });
});

describe("生活費（予算）", () => {
  it("何も設定していなければ0", async () => {
    expect(await getDefaultBudget()).toBe(0);
    expect(await getMonthBudget("2026-08")).toEqual({
      amountYen: 0,
      defaultYen: 0,
      isOverride: false,
    });
  });

  it("既定額はどの月にも効く", async () => {
    await setDefaultBudget(80000);

    for (const month of ["2026-08", "2026-09", "2027-01"]) {
      expect(await getMonthBudget(month)).toEqual({
        amountYen: 80000,
        defaultYen: 80000,
        isOverride: false,
      });
    }
  });

  it("その月だけの上書きが既定額に優先する", async () => {
    await setDefaultBudget(80000);
    await setMonthBudget("2026-09", 50000);

    expect(await getMonthBudget("2026-09")).toEqual({
      amountYen: 50000,
      defaultYen: 80000,
      isOverride: true,
    });
    // 他の月は影響を受けない
    expect((await getMonthBudget("2026-08")).amountYen).toBe(80000);
  });

  it("上書きを外すと既定額に戻る", async () => {
    await setDefaultBudget(80000);
    await setMonthBudget("2026-09", 50000);
    await clearMonthBudget("2026-09");

    expect(await getMonthBudget("2026-09")).toEqual({
      amountYen: 80000,
      defaultYen: 80000,
      isOverride: false,
    });
  });

  it("同じ月に二度設定しても行が増えず、後の値が残る", async () => {
    await setMonthBudget("2026-08", 50000);
    await setMonthBudget("2026-08", 60000);
    expect((await getMonthBudget("2026-08")).amountYen).toBe(60000);
  });

  it("既定額を変えても既存の上書きは残る", async () => {
    await setMonthBudget("2026-09", 50000);
    await setDefaultBudget(90000);

    expect((await getMonthBudget("2026-09")).amountYen).toBe(50000);
    expect((await getMonthBudget("2026-10")).amountYen).toBe(90000);
  });

  it("月を読むだけでは上書きを作らない", async () => {
    await setDefaultBudget(80000);
    await getMonthBudget("2026-11");
    expect((await getMonthBudget("2026-11")).isOverride).toBe(false);
  });
});

describe("カテゴリ", () => {
  it("使用件数つきで一覧できる。0件のカテゴリも落ちない", async () => {
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 100, kind: "expense", categoryId: food.id });
    await createTransaction({ occurredOn: "2026-08-02", amountYen: 100, kind: "expense", categoryId: food.id });

    const rows = await listCategoriesWithUsage();
    expect(rows.map((r) => [r.name, r.usageCount])).toEqual([
      ["食費", 2],
      ["日用品", 0],
      ["外食", 0],
    ]);
  });

  it("並び順は sortOrder に従う", async () => {
    const rows = await listCategories();
    expect(rows.map((r) => r.name)).toEqual(["食費", "日用品", "外食"]);
  });

  it("名前で引ける", async () => {
    expect((await findCategoryByName("食費"))?.id).toBe(food.id);
    expect(await findCategoryByName("存在しない")).toBeUndefined();
  });

  it("名前と色を更新できる", async () => {
    const updated = await updateCategory(food.id, { name: "食料品", color: "red" });
    expect(updated.name).toBe("食料品");
    expect(updated.color).toBe("red");
  });

  it("次の並び順は末尾に続く。999 の番兵は無視する", async () => {
    expect(await nextSortOrder("expense")).toBe(40);

    await createCategory({ name: "その他", kind: "expense", color: "red", sortOrder: 999 });
    expect(await nextSortOrder("expense")).toBe(40);
  });

  it("使用件数を数えられる", async () => {
    await createTransaction({ occurredOn: "2026-08-01", amountYen: 100, kind: "expense", categoryId: daily.id });
    expect(await countTransactionsForCategory(daily.id)).toBe(1);
    expect(await countTransactionsForCategory(dining.id)).toBe(0);
  });

  it("使われていないカテゴリは削除できる", async () => {
    await deleteCategory(dining.id);
    expect(await findCategoryByName("外食")).toBeUndefined();
  });

  it("同じ名前は二度登録できない", async () => {
    await expect(
      createCategory({ name: "食費", kind: "expense", color: "red", sortOrder: 99 }),
    ).rejects.toThrow();
  });
});

describe("明細の登録と削除", () => {
  it("登録した明細を削除できる", async () => {
    const created = await createTransaction({
      occurredOn: "2026-08-10",
      amountYen: 1234,
      kind: "expense",
      categoryId: food.id,
      memo: "メモ",
    });
    expect(created.amountYen).toBe(1234);
    expect(created.memo).toBe("メモ");

    await deleteTransaction(created.id);
    expect(await listTransactionsByMonth("2026-08")).toEqual([]);
  });

  it("存在しないカテゴリでは登録できない", async () => {
    await expect(
      createTransaction({ occurredOn: "2026-08-10", amountYen: 100, kind: "expense", categoryId: 99999 }),
    ).rejects.toThrow();
  });

  it("使用中のカテゴリは外部キー制約で削除できない", async () => {
    await createTransaction({ occurredOn: "2026-08-10", amountYen: 100, kind: "expense", categoryId: food.id });
    await expect(deleteCategory(food.id)).rejects.toThrow();
  });
});
