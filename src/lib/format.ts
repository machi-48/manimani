const numberFormat = new Intl.NumberFormat("ja-JP");

export function formatYen(amount: number): string {
  return `${numberFormat.format(amount)}円`;
}

/** 収支のように符号を見せたい場所で使う。 */
export function formatSignedYen(amount: number): string {
  const sign = amount > 0 ? "+" : amount < 0 ? "-" : "";
  return `${sign}${numberFormat.format(Math.abs(amount))}円`;
}
