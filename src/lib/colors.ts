import type { ColorSlot } from "@/db/schema";

/**
 * globals.css で定義した CSS 変数を参照する。
 * 実際の hex はライト／ダークで別々に検証済みの値が入るので、ここでは色名を持たない。
 */
export function colorVar(slot: ColorSlot): string {
  return `var(--cat-${slot})`;
}

/** 色の選択 UI で読み上げ・ツールチップに使う日本語名。 */
export const COLOR_LABELS: Record<ColorSlot, string> = {
  blue: "青",
  orange: "オレンジ",
  aqua: "青緑",
  yellow: "黄",
  magenta: "ピンク",
  green: "緑",
  violet: "紫",
  red: "赤",
};
