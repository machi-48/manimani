import { sql } from "drizzle-orm";

import { db } from "./index";
import { categories, settings, type NewCategory } from "./schema";

/**
 * 生活費の集計が目的なので、支出のカテゴリだけを最小限持つ。
 * 色は検証済みパレットの固定順（1番目から）で割り当てる。
 */
const DEFAULT_CATEGORIES: NewCategory[] = [
  { name: "食費", kind: "expense", color: "orange", sortOrder: 10 },
  { name: "日用品", kind: "expense", color: "blue", sortOrder: 20 },
  { name: "外食", kind: "expense", color: "yellow", sortOrder: 30 },
  { name: "交通費", kind: "expense", color: "aqua", sortOrder: 40 },
  { name: "娯楽", kind: "expense", color: "magenta", sortOrder: 50 },
];

async function seed() {
  // 名前を一意キーにした upsert。何度流しても同じ結果になり、
  // 色のような後から足した列も既存行に行き渡る。
  const rows = await db
    .insert(categories)
    .values(DEFAULT_CATEGORIES)
    .onConflictDoUpdate({
      target: categories.name,
      set: {
        kind: sql`excluded.kind`,
        color: sql`excluded.color`,
        sortOrder: sql`excluded.sort_order`,
      },
    })
    .returning();

  // 設定行を用意する。既に設定済みの生活費は上書きしない
  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  console.log(`categories: ${rows.length} 件を登録しました`);
}

seed();
