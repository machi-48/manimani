import { and, desc, eq, gte, lte, sql, sum } from "drizzle-orm";

import { daysInMonth } from "@/lib/month";

import { db } from "./index";
import {
  budgets,
  categories,
  settings,
  transactions,
  type Kind,
  type NewCategory,
  type NewTransaction,
} from "./schema";

/** 'YYYY-MM' から、その月の初日と末日を 'YYYY-MM-DD' で返す。 */
function monthRange(month: string) {
  return {
    from: `${month}-01`,
    to: `${month}-${String(daysInMonth(month)).padStart(2, "0")}`,
  };
}

export async function listTransactionsByMonth(month: string) {
  const { from, to } = monthRange(month);
  return db.query.transactions.findMany({
    where: and(gte(transactions.occurredOn, from), lte(transactions.occurredOn, to)),
    orderBy: [desc(transactions.occurredOn), desc(transactions.id)],
    with: { category: true },
  });
}

/** 月次のカテゴリ別合計。集計は SQL 側で済ませる。 */
export async function summarizeByCategory(month: string, kind: Kind) {
  const { from, to } = monthRange(month);
  return db
    .select({
      categoryId: categories.id,
      categoryName: categories.name,
      categoryColor: categories.color,
      totalYen: sum(transactions.amountYen).mapWith(Number),
      count: sql<number>`count(*)`,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.kind, kind),
        gte(transactions.occurredOn, from),
        lte(transactions.occurredOn, to),
      ),
    )
    .groupBy(categories.id, categories.name)
    .orderBy(desc(sum(transactions.amountYen)));
}

/** 月の収入・支出・収支を1クエリで求める。 */
export async function monthlyBalance(month: string) {
  const { from, to } = monthRange(month);
  const [row] = await db
    .select({
      incomeYen: sql<number>`coalesce(sum(case when ${transactions.kind} = 'income' then ${transactions.amountYen} else 0 end), 0)`,
      expenseYen: sql<number>`coalesce(sum(case when ${transactions.kind} = 'expense' then ${transactions.amountYen} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(gte(transactions.occurredOn, from), lte(transactions.occurredOn, to)));

  return { ...row, balanceYen: row.incomeYen - row.expenseYen };
}

export async function listCategories(kind?: Kind) {
  return db.query.categories.findMany({
    where: kind ? eq(categories.kind, kind) : undefined,
    orderBy: [categories.sortOrder, categories.id],
  });
}

/** カテゴリ一覧に、それぞれ何件の明細から参照されているかを添えて返す。 */
export async function listCategoriesWithUsage() {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      kind: categories.kind,
      color: categories.color,
      sortOrder: categories.sortOrder,
      usageCount: sql<number>`count(${transactions.id})`,
    })
    .from(categories)
    .leftJoin(transactions, eq(transactions.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.kind, categories.sortOrder, categories.id);
}

export async function findCategoryByName(name: string) {
  return db.query.categories.findFirst({ where: eq(categories.name, name) });
}

export async function createCategory(input: NewCategory) {
  const [created] = await db.insert(categories).values(input).returning();
  return created;
}

export async function updateCategory(
  id: number,
  input: Pick<NewCategory, "name" | "color">,
) {
  const [updated] = await db
    .update(categories)
    .set(input)
    .where(eq(categories.id, id))
    .returning();
  return updated;
}

export async function deleteCategory(id: number) {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function getDefaultBudget() {
  const row = await db.query.settings.findFirst({ where: eq(settings.id, 1) });
  return row?.defaultBudgetYen ?? 0;
}

/**
 * その月の生活費。上書きが無ければ既定額にフォールバックする。
 * 読み取り時に行を作らないので、月を開くだけでは何も書き込まれない。
 */
export async function getMonthBudget(month: string) {
  const [override, defaultYen] = await Promise.all([
    db.query.budgets.findFirst({ where: eq(budgets.month, month) }),
    getDefaultBudget(),
  ]);

  return {
    amountYen: override?.amountYen ?? defaultYen,
    defaultYen,
    isOverride: override !== undefined,
  };
}

export async function setMonthBudget(month: string, amountYen: number) {
  await db
    .insert(budgets)
    .values({ month, amountYen })
    .onConflictDoUpdate({ target: budgets.month, set: { amountYen } });
}

export async function clearMonthBudget(month: string) {
  await db.delete(budgets).where(eq(budgets.month, month));
}

export async function setDefaultBudget(amountYen: number) {
  await db
    .insert(settings)
    .values({ id: 1, defaultBudgetYen: amountYen })
    .onConflictDoUpdate({ target: settings.id, set: { defaultBudgetYen: amountYen } });
}

export async function countTransactionsForCategory(categoryId: number) {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, categoryId));
  return row.count;
}

/** 新しいカテゴリを一覧の末尾に置くための並び順。 */
export async function nextSortOrder(kind: Kind) {
  const [row] = await db
    .select({ max: sql<number | null>`max(${categories.sortOrder})` })
    .from(categories)
    .where(and(eq(categories.kind, kind), lte(categories.sortOrder, 900)));
  return (row.max ?? 0) + 10;
}

export async function createTransaction(input: NewTransaction) {
  const [created] = await db.insert(transactions).values(input).returning();
  return created;
}

export async function deleteTransaction(id: number) {
  await db.delete(transactions).where(eq(transactions.id, id));
}
