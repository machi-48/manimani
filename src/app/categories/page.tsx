import Link from "next/link";

import { listCategoriesWithUsage } from "@/db/queries";
import { COLORS, type ColorSlot } from "@/db/schema";

import { CategoryRow, type CategoryRowData } from "./category-row";
import { NewCategoryForm } from "./new-category-form";

export const metadata = { title: "カテゴリ設定 | manimani" };

// DB を読むページなので、ビルド時の内容で固定されないよう毎回サーバーで描画する
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories: CategoryRowData[] = await listCategoriesWithUsage();

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">カテゴリ設定</h1>
        <Link
          href="/"
          className="rounded-md px-2.5 py-1.5 text-sm text-black/50 transition hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          ← 戻る
        </Link>
      </header>

      <p className="mt-3 text-sm text-black/50 dark:text-white/50">
        左の丸をタップすると色を変えられます。
      </p>

      <ul className="mt-5 divide-y divide-black/8 border-y border-black/8 dark:divide-white/10 dark:border-white/10">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} />
        ))}
      </ul>

      <NewCategoryForm suggestedColor={nextUnusedColor(categories)} />
    </main>
  );
}

/** 新規追加の初期色。まだ使われていない枠を固定順で先頭から選ぶ。 */
function nextUnusedColor(categories: CategoryRowData[]): ColorSlot {
  const used = new Set(categories.map((category) => category.color));
  return COLORS.find((slot) => !used.has(slot)) ?? COLORS[0];
}
