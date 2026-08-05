import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// 本物の DB ファイルを触らないよう、テストごとに使い捨ての SQLite を指す。
// src/db/index.ts は初回利用時に環境変数を読むので、ここで先に差し替えておけば間に合う。
const dir = mkdtempSync(join(tmpdir(), "manimani-test-"));
process.env.TURSO_DATABASE_URL = `file:${join(dir, "test.db")}`;
delete process.env.TURSO_AUTH_TOKEN;

// 認証まわりのテスト用。本番の値とは無関係。
process.env.APP_PASSWORD = "test-password-1234";
process.env.APP_SECRET = "test-secret-0123456789abcdef";
