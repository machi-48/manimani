const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

/** ローカル時刻の今日を 'YYYY-MM-DD' で返す。UTC 変換を挟むと日付がずれるため使わない。 */
export function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonth(): string {
  return today().slice(0, 7);
}

export function isValidMonth(value: unknown): value is string {
  return typeof value === "string" && MONTH_PATTERN.test(value);
}

/** 月を delta か月ずらす。年またぎは Date に任せる。 */
export function shiftMonth(month: string, delta: number): string {
  const [year, mon] = month.split("-").map(Number);
  const shifted = new Date(year, mon - 1 + delta, 1);
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}`;
}

export function daysInMonth(month: string): number {
  const [year, mon] = month.split("-").map(Number);
  // 翌月の0日目 = その月の末日
  return new Date(year, mon, 0).getDate();
}

/**
 * その月の何日目まで来ているか。
 * 今月以外は null を返す。終わった月・まだ来ていない月に「今日までの目安」は無いため。
 */
export function elapsedDaysInMonth(month: string): number | null {
  const now = today();
  if (month !== now.slice(0, 7)) return null;
  return Number(now.slice(8, 10));
}

export function formatMonthLabel(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${year}年${mon}月`;
}

export function formatDayLabel(date: string): string {
  const [, mon, day] = date.split("-").map(Number);
  return `${mon}/${day}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
