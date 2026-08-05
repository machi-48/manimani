import { afterEach, describe, expect, it, vi } from "vitest";

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

afterEach(() => {
  vi.useRealTimers();
});

describe("daysInMonth", () => {
  it("月ごとの日数を返す", () => {
    expect(daysInMonth("2026-01")).toBe(31);
    expect(daysInMonth("2026-04")).toBe(30);
    expect(daysInMonth("2026-08")).toBe(31);
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("うるう年の2月を29日として扱う", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2024-02")).toBe(29);
    // 100で割れて400で割れない年はうるう年ではない
    expect(daysInMonth("1900-02")).toBe(28);
    expect(daysInMonth("2000-02")).toBe(29);
  });
});

describe("shiftMonth", () => {
  it("同じ年の中で前後に動く", () => {
    expect(shiftMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftMonth("2026-08", -1)).toBe("2026-07");
  });

  it("年をまたぐ", () => {
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });

  it("複数年ぶんずらせる", () => {
    expect(shiftMonth("2026-08", 12)).toBe("2027-08");
    expect(shiftMonth("2026-08", -20)).toBe("2024-12");
  });

  it("末日の月から動かしても日付に引きずられない", () => {
    // 1月31日を基準に月を足すと2月31日=3月3日に流れる実装があるため
    expect(shiftMonth("2026-01", 1)).toBe("2026-02");
    expect(shiftMonth("2026-03", -1)).toBe("2026-02");
  });
});

describe("isValidMonth", () => {
  it("正しい形式だけを通す", () => {
    expect(isValidMonth("2026-08")).toBe(true);
    expect(isValidMonth("2026-01")).toBe(true);
    expect(isValidMonth("2026-12")).toBe(true);
  });

  it("月の範囲外や壊れた入力を弾く", () => {
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-00")).toBe(false);
    expect(isValidMonth("2026-8")).toBe(false);
    expect(isValidMonth("2026-08-01")).toBe(false);
    expect(isValidMonth("bogus")).toBe(false);
    expect(isValidMonth("")).toBe(false);
    expect(isValidMonth(undefined)).toBe(false);
    expect(isValidMonth(202608)).toBe(false);
  });
});

describe("today", () => {
  it("UTC ではなくローカル時刻の日付を返す", () => {
    // ローカルで 8/4 の夜。UTC に直すと日付が翌日にずれる時間帯を選んでいる
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 4, 23, 30, 0));
    expect(today()).toBe("2026-08-04");
    expect(currentMonth()).toBe("2026-08");
  });

  it("月初や1桁の日を0埋めする", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 0, 1, 9, 0, 0));
    expect(today()).toBe("2026-01-01");
  });
});

describe("elapsedDaysInMonth", () => {
  it("今月なら何日目かを返す", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    expect(elapsedDaysInMonth("2026-08")).toBe(5);
  });

  it("終わった月・まだ来ていない月は null", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 5, 12, 0, 0));
    expect(elapsedDaysInMonth("2026-07")).toBeNull();
    expect(elapsedDaysInMonth("2026-09")).toBeNull();
    expect(elapsedDaysInMonth("2025-08")).toBeNull();
  });

  it("月末は月の日数と一致する", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 31, 23, 0, 0));
    expect(elapsedDaysInMonth("2026-08")).toBe(31);
    expect(elapsedDaysInMonth("2026-08")).toBe(daysInMonth("2026-08"));
  });
});

describe("表示用の整形", () => {
  it("月と日をラベルにする", () => {
    expect(formatMonthLabel("2026-08")).toBe("2026年8月");
    expect(formatMonthLabel("2026-01")).toBe("2026年1月");
    expect(formatDayLabel("2026-08-04")).toBe("8/4");
    expect(formatDayLabel("2026-12-25")).toBe("12/25");
  });
});
