import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createSessionToken,
  isAuthConfigured,
  timingSafeEqual,
  verifyPassword,
  verifySessionToken,
} from "@/lib/auth";

afterEach(() => {
  vi.useRealTimers();
  process.env.APP_PASSWORD = "test-password-1234";
  process.env.APP_SECRET = "test-secret-0123456789abcdef";
});

describe("timingSafeEqual", () => {
  it("同じ文字列だけ true", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("", "")).toBe(true);
  });

  it("長さが違えば false", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("abcd", "abc")).toBe(false);
  });
});

describe("verifyPassword", () => {
  it("一致したときだけ true", () => {
    expect(verifyPassword("test-password-1234")).toBe(true);
    expect(verifyPassword("test-password-123")).toBe(false);
    expect(verifyPassword("")).toBe(false);
  });

  it("APP_PASSWORD が未設定なら常に false", () => {
    delete process.env.APP_PASSWORD;
    expect(verifyPassword("")).toBe(false);
    expect(verifyPassword("test-password-1234")).toBe(false);
  });
});

describe("isAuthConfigured", () => {
  it("両方揃ったときだけ true", () => {
    expect(isAuthConfigured()).toBe(true);

    delete process.env.APP_PASSWORD;
    expect(isAuthConfigured()).toBe(false);

    process.env.APP_PASSWORD = "x";
    delete process.env.APP_SECRET;
    expect(isAuthConfigured()).toBe(false);
  });
});

describe("セッショントークン", () => {
  it("発行したトークンを検証できる", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
  });

  it("署名を書き換えたら通らない", async () => {
    const token = await createSessionToken();
    const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
    expect(await verifySessionToken(tampered)).toBe(false);
  });

  it("発行時刻だけ書き換えても通らない", async () => {
    const token = await createSessionToken();
    const [label, , signature] = token.split(".");
    const forged = `${label}.${Date.now() + 1000}.${signature}`;
    expect(await verifySessionToken(forged)).toBe(false);
  });

  it("秘密鍵が違えば通らない", async () => {
    const token = await createSessionToken();
    process.env.APP_SECRET = "another-secret";
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("形式が壊れていれば通らない", async () => {
    expect(await verifySessionToken(undefined)).toBe(false);
    expect(await verifySessionToken("")).toBe(false);
    expect(await verifySessionToken("manimani")).toBe(false);
    expect(await verifySessionToken("manimani.123")).toBe(false);
    expect(await verifySessionToken("a.b.c.d")).toBe(false);
    expect(await verifySessionToken("other.123.abc")).toBe(false);
  });

  it("30日を過ぎると失効する", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T00:00:00Z"));
    const token = await createSessionToken();

    vi.setSystemTime(new Date("2026-09-03T23:00:00Z")); // 約29日後
    expect(await verifySessionToken(token)).toBe(true);

    vi.setSystemTime(new Date("2026-09-04T01:00:00Z")); // 30日を超えた
    expect(await verifySessionToken(token)).toBe(false);
  });

  it("未来に発行されたトークンは通さない", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-05T12:00:00Z"));
    const token = await createSessionToken();

    vi.setSystemTime(new Date("2026-08-05T11:00:00Z")); // 発行より前の時刻
    expect(await verifySessionToken(token)).toBe(false);
  });
});
