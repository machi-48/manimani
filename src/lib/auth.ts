export const SESSION_COOKIE = "manimani_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_LABEL = "manimani";

/**
 * 認証に必要な環境変数が揃っているか。
 * 揃っていない状態で本番に出すと誰でも読み書きできてしまうので、
 * middleware 側で本番のみ通信を止める。
 */
export function isAuthConfigured(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.APP_SECRET);
}

/**
 * 文字列の比較にかかる時間を入力内容で変えない。
 * パスワード照合で1文字ずつ早期 return すると、応答時間から先頭何文字が
 * 合っているか推測できてしまうため。
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function verifyPassword(input: string): boolean {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  return timingSafeEqual(input, expected);
}

// Web Crypto を使う。middleware は Edge ランタイムで動き、node:crypto が使えないため。
async function sign(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(process.env.APP_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/** 発行時刻を署名に含めるので、期限だけを書き換えたトークンは作れない。 */
export async function createSessionToken(): Promise<string> {
  const payload = `${SESSION_LABEL}.${Date.now()}`;
  return `${payload}.${await sign(payload)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const parts = token.split(".");
  if (parts.length !== 3) return false;

  const [label, issuedAt, signature] = parts;
  if (label !== SESSION_LABEL) return false;

  if (!timingSafeEqual(signature, await sign(`${label}.${issuedAt}`))) return false;

  const age = Date.now() - Number(issuedAt);
  return Number.isFinite(age) && age >= 0 && age < SESSION_TTL_MS;
}

export const SESSION_MAX_AGE_SECONDS = SESSION_TTL_MS / 1000;
