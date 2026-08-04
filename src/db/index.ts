import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * 接続先。Turso を使うときは環境変数で URL とトークンを渡す。
 * 何も指定しなければローカルのファイルを見るので、開発中は今までどおり動く。
 */
export const DB_URL = process.env.TURSO_DATABASE_URL ?? "file:manimani.db";

type Db = LibSQLDatabase<typeof schema>;

// dev の HMR ではモジュールが再評価されるので、接続を globalThis に載せて増殖を防ぐ
const globalForDb = globalThis as typeof globalThis & {
  __libsql?: Client;
  __db?: Db;
};

function connect(): Db {
  // 本番で URL が未設定だと、書き込めないローカルファイルを黙って掴んでしまう。
  // 原因の分かる形で早めに止める。
  if (!process.env.TURSO_DATABASE_URL && process.env.NODE_ENV === "production") {
    throw new Error(
      "TURSO_DATABASE_URL が設定されていません。Turso の接続先を環境変数で指定してください。",
    );
  }

  const client =
    globalForDb.__libsql ??
    createClient({ url: DB_URL, authToken: process.env.TURSO_AUTH_TOKEN });

  // SQLite は既定で外部キーを検査しない。
  // ローカルファイル接続では明示的に有効化する（Turso 側は既定で有効）。
  if (!globalForDb.__libsql && DB_URL.startsWith("file:")) {
    void client.execute("PRAGMA foreign_keys = ON");
  }

  if (process.env.NODE_ENV !== "production") globalForDb.__libsql = client;

  return drizzle(client, { schema });
}

function getDb(): Db {
  const cached = globalForDb.__db;
  if (cached) return cached;

  const created = connect();
  globalForDb.__db = created;
  return created;
}

/**
 * 初回に使われるまで接続を作らない。
 * モジュール読み込み時に繋ぐと、ビルドの解析中にも接続を試みてしまうため。
 * 呼び出し側からは通常の drizzle インスタンスとして扱える。
 */
export const db = new Proxy({} as Db, {
  get(_target, property) {
    const actual = getDb();
    const value = Reflect.get(actual, property, actual);
    // メソッドは実体に束縛する。Proxy 越しだと内部の private フィールドが解決できないため
    return typeof value === "function" ? value.bind(actual) : value;
  },
});
