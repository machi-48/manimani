import Link from "next/link";

import {
  getMonthBudget,
  listCategories,
  listTransactionsByMonth,
  summarizeByCategory,
} from "@/db/queries";
import { colorVar } from "@/lib/colors";
import { formatYen } from "@/lib/format";
import {
  currentMonth,
  daysInMonth,
  elapsedDaysInMonth,
  formatDayLabel,
  formatMonthLabel,
  isValidMonth,
  shiftMonth,
  today,
} from "@/lib/month";

import { removeTransaction } from "./actions";
import { BudgetCard } from "./budget-card";
import { TransactionForm } from "./transaction-form";

export default async function Home({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const month = isValidMonth(params.month) ? params.month : currentMonth();

  const [byCategory, entries, categories, budget] = await Promise.all([
    summarizeByCategory(month, "expense"),
    listTransactionsByMonth(month),
    listCategories("expense"),
    getMonthBudget(month),
  ]);

  // 表示する月が今月なら今日、過去月ならその月の1日を初期値にする
  const defaultDate = month === currentMonth() ? today() : `${month}-01`;
  const total = byCategory.reduce((sum, row) => sum + row.totalYen, 0);

  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight">manimani</h1>
        <Link
          href="/categories"
          className="rounded-md px-2.5 py-1.5 text-sm text-black/50 transition hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
        >
          カテゴリ設定
        </Link>
      </header>

      <section className="mt-6 rounded-xl border border-black/10 px-5 py-5 dark:border-white/15">
        <nav className="flex items-center justify-between" aria-label="表示する月">
          <MonthLink month={shiftMonth(month, -1)} label="前の月へ">
            ←
          </MonthLink>
          <span className="text-sm font-medium tabular-nums">
            {formatMonthLabel(month)}
          </span>
          <MonthLink month={shiftMonth(month, 1)} label="次の月へ">
            →
          </MonthLink>
        </nav>
        <div className="mt-4">
          <BudgetCard
            month={month}
            monthLabel={formatMonthLabel(month)}
            budgetYen={budget.amountYen}
            defaultYen={budget.defaultYen}
            isOverride={budget.isOverride}
            spentYen={total}
            entryCount={entries.length}
            elapsedDays={elapsedDaysInMonth(month)}
            daysInMonth={daysInMonth(month)}
          />
        </div>
      </section>

      <div className="mt-8 flex flex-col gap-8 lg:grid lg:grid-cols-[20rem_1fr] lg:items-start">
        <section className="rounded-xl border border-black/10 p-5 dark:border-white/15">
          <h2 className="mb-4 text-sm font-semibold">記録する</h2>
          <TransactionForm categories={categories} defaultDate={defaultDate} />
        </section>

        <div className="flex flex-col gap-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold">カテゴリ別</h2>
            {byCategory.length === 0 ? (
              <EmptyState>この月の記録はまだありません。</EmptyState>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {byCategory.map((row) => (
                  <li key={row.categoryId} className="flex flex-col gap-1">
                    {/* 色は目印で、識別はこの行のカテゴリ名が担う */}
                    <div className="flex items-baseline justify-between text-sm">
                      <span>
                        {row.categoryName}
                        <span className="ml-2 text-xs text-black/40 dark:text-white/40">
                          {row.count}件
                        </span>
                      </span>
                      <span className="font-medium tabular-nums">
                        {formatYen(row.totalYen)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-black/8 dark:bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.totalYen / total) * 100}%`,
                          backgroundColor: colorVar(row.categoryColor),
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold">明細</h2>
            {entries.length === 0 ? (
              <EmptyState>この月の記録はまだありません。</EmptyState>
            ) : (
              <ul className="divide-y divide-black/8 border-y border-black/8 dark:divide-white/10 dark:border-white/10">
                {entries.map((entry) => (
                  <li key={entry.id} className="flex items-center gap-3 py-3">
                    <span className="w-10 shrink-0 text-xs tabular-nums text-black/40 dark:text-white/40">
                      {formatDayLabel(entry.occurredOn)}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: colorVar(entry.category.color) }}
                      />
                      {entry.category.name}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-black/60 dark:text-white/60">
                      {entry.memo}
                    </span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">
                      {formatYen(entry.amountYen)}
                    </span>
                    <form action={removeTransaction} className="shrink-0">
                      <input type="hidden" name="id" value={entry.id} />
                      <button
                        type="submit"
                        aria-label={`${formatDayLabel(entry.occurredOn)}の${entry.category.name}を削除`}
                        className="grid size-9 place-items-center rounded text-sm text-black/25 transition hover:bg-rose-500/10 hover:text-rose-600 dark:text-white/25 dark:hover:text-rose-400"
                      >
                        ×
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function MonthLink({
  month,
  label,
  children,
}: {
  month: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/?month=${month}`}
      aria-label={label}
      className="grid size-9 place-items-center rounded-md text-sm text-black/50 transition hover:bg-black/5 dark:text-white/50 dark:hover:bg-white/10"
    >
      {children}
    </Link>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-black/15 px-4 py-8 text-center text-sm text-black/40 dark:border-white/15 dark:text-white/40">
      {children}
    </p>
  );
}
