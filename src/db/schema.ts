import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/** 収入か支出か。金額の符号ではなくこの列で区別する。 */
export const KINDS = ["income", "expense"] as const;
export type Kind = (typeof KINDS)[number];

/**
 * カテゴリの色。hex ではなくスロット名で保存する。
 * ライト用とダーク用でそれぞれ検証済みの色を出し分けたいので、
 * 具体的な色の値は CSS 変数（globals.css の --cat-*）側に持たせる。
 */
export const COLORS = [
  "blue",
  "orange",
  "aqua",
  "yellow",
  "magenta",
  "green",
  "violet",
  "red",
] as const;
export type ColorSlot = (typeof COLORS)[number];

export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  kind: text("kind", { enum: KINDS }).notNull(),
  color: text("color", { enum: COLORS }).notNull().default("blue"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const transactions = sqliteTable(
  "transactions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    /**
     * 発生日。'YYYY-MM-DD' 固定。
     * SQLite に日付型はないが、この形式なら文字列比較のまま範囲検索でき、
     * Postgres へ移行するときも date 列にそのまま入る。
     */
    occurredOn: text("occurred_on").notNull(),
    /** 金額は円を整数で保持する。丸め誤差を持ち込まないため小数は使わない。 */
    amountYen: integer("amount_yen").notNull(),
    kind: text("kind", { enum: KINDS }).notNull(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categories.id),
    memo: text("memo"),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (table) => [
    // 月次集計が主な読み取りパターンなので日付に索引を張る
    index("transactions_occurred_on_idx").on(table.occurredOn),
    index("transactions_category_id_idx").on(table.categoryId),
  ],
);

/**
 * その月に使える生活費。毎月ほぼ同じ額なので、
 * 既定額は settings に1つ持ち、この表は「その月だけ違う額」の上書きだけを持つ。
 * 行が無い月は既定額が使われるので、月をまたぐたびに書き込む必要がない。
 */
export const budgets = sqliteTable("budgets", {
  /** 'YYYY-MM' */
  month: text("month").primaryKey(),
  amountYen: integer("amount_yen").notNull(),
});

/** アプリ全体の設定。行は id = 1 の1件だけ。 */
export const settings = sqliteTable("settings", {
  id: integer("id").primaryKey(),
  /** 毎月の生活費の既定額。0 は未設定を表す。 */
  defaultBudgetYen: integer("default_budget_yen").notNull().default(0),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
