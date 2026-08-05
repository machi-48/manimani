import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";

import { db } from "@/db/index";
import { categories, settings } from "@/db/schema";

/** 本物のマイグレーションを一時 DB に流す。スキーマの再定義はしない。 */
export async function migrateTestDb() {
  await migrate(db, { migrationsFolder: "./drizzle" });
}

/** テスト間で状態を持ち越さないよう、全テーブルを空にして設定行だけ戻す。 */
export async function resetTestDb() {
  await db.run(sql`PRAGMA foreign_keys = OFF`);
  await db.run(sql`DELETE FROM transactions`);
  await db.run(sql`DELETE FROM categories`);
  await db.run(sql`DELETE FROM budgets`);
  await db.run(sql`DELETE FROM settings`);
  await db.run(sql`DELETE FROM sqlite_sequence`);
  await db.run(sql`PRAGMA foreign_keys = ON`);
  await db.insert(settings).values({ id: 1, defaultBudgetYen: 0 });
}

/** テストで使うカテゴリを決まった並びで作る。 */
export async function seedTestCategories() {
  return db
    .insert(categories)
    .values([
      { name: "食費", kind: "expense", color: "orange", sortOrder: 10 },
      { name: "日用品", kind: "expense", color: "blue", sortOrder: 20 },
      { name: "外食", kind: "expense", color: "yellow", sortOrder: 30 },
    ])
    .returning();
}
