# manimani

household account book

## Tech stack

- [Next.js](https://nextjs.org) (App Router, Turbopack)
- TypeScript
- Tailwind CSS
- ESLint
- [Drizzle ORM](https://orm.drizzle.team) + [libSQL / Turso](https://turso.tech)

## Getting Started

```bash
npm install
npm run db:migrate   # スキーマを DB に適用
npm run db:seed      # 初期カテゴリを投入
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

環境変数は無くても動く。その場合ローカルの `manimani.db` を使い、ログインは素通しになる。
設定できる値は [.env.example](.env.example) を参照。

## デプロイ

### 1. Turso にデータベースを作る

```bash
curl -sSfL https://get.tur.so/install.sh | bash
turso auth login
turso db create manimani

turso db show manimani --url        # → TURSO_DATABASE_URL
turso db tokens create manimani     # → TURSO_AUTH_TOKEN
```

`brew install tursodatabase/tap/turso` は使わない。この formula は
ローカル開発用サーバー sqld（`libsql/sqld` tap）に依存していて、
tap を足していないと `No available formula with the name "libsql/sqld/sqld"` で失敗する。
クラウドに DB を作るだけなら sqld は不要なので、上のスクリプトで入れる方が簡単。

### 2. Turso にスキーマと初期カテゴリを流す

```bash
export TURSO_DATABASE_URL='libsql://...'
export TURSO_AUTH_TOKEN='...'
npm run db:migrate
npm run db:seed
```

### 3. Vercel にデプロイ

GitHub に push して Vercel にインポートし、環境変数を4つ設定する。

| 変数 | 値 |
| --- | --- |
| `TURSO_DATABASE_URL` | 手順1で取得した URL |
| `TURSO_AUTH_TOKEN` | 手順1で取得したトークン |
| `APP_PASSWORD` | ログインに使うパスワード |
| `APP_SECRET` | `openssl rand -hex 32` で生成した文字列 |

`APP_PASSWORD` と `APP_SECRET` が揃っていないと、本番では 500 を返して全ての通信を止める
（設定漏れで誰でも読み書きできる状態にしないため）。`TURSO_DATABASE_URL` も本番では必須。

ローカルの記録を移したい場合、件数が少なければ画面から入れ直すのが早い。
まとまった量があるなら `turso db shell manimani < dump.sql` で流し込む。

## Scripts

| command | description |
| --- | --- |
| `npm run dev` | start the dev server |
| `npm run build` | production build |
| `npm run start` | serve the production build |
| `npm run lint` | run ESLint |
| `npm test` | テストを一度実行 |
| `npm run test:watch` | テストを監視実行 |
| `npm run db:generate` | スキーマ変更からマイグレーション SQL を生成 |
| `npm run db:migrate` | 未適用のマイグレーションを DB に適用 |
| `npm run db:seed` | 初期カテゴリを投入（再実行しても重複しない） |
| `npm run db:studio` | Drizzle Studio で DB を GUI から確認 |

## テスト

Vitest。`tests/` 以下にある。

DB を触るテストは**モックせず、一時ファイルの SQLite に本物のマイグレーションを流して**検証する
（`tests/setup.ts` が `TURSO_DATABASE_URL` を使い捨ての一時ファイルに差し替える）。
集計は SQL そのものが実装の本体なので、モックすると何も検証できないため。
本物の `manimani.db` には触らない。

Server Action のテストでは `next/cache` の `revalidatePath` だけ差し替える。
リクエストの文脈が無いと動かないためで、検証対象は入力の受け付け方と DB に入る内容。

## データ層のメモ

- 接続は libSQL 経由。`TURSO_DATABASE_URL` が未設定ならローカルの `file:manimani.db`（gitignore 済み）を使う。同じドライバのままローカルと Turso を切り替えられるので、SQL の方言差を気にしなくていい。
- DB 接続は**初回に使われるまで作らない**（`src/db/index.ts` の Proxy）。モジュール読み込み時に繋ぐと、ビルドの解析中にも接続してしまい、本番用のガードがビルドを落とすため。
- ログインは `src/proxy.ts`（Next 16 で `middleware` から改名された規約）で全ページを塞ぐ。セッションは HMAC 署名した Cookie で、発行時刻を署名に含めるので期限だけの改ざんはできない。有効期限は30日。
- 金額は**円を整数**（`amount_yen`）で保持する。小数・浮動小数点は使わない。
- 日付は `'YYYY-MM-DD'` の文字列（`occurred_on`）。文字列比較のまま範囲検索でき、Postgres の `date` にもそのまま移行できる。
- **予算型の家計簿。** 月ごとに使える生活費を決め、そこから支出を引いた残額を見る。生活費は収入明細としてではなく**予算**として持つので、`transactions` は支出だけが入る（`kind` は全て `expense`。収入を明細として扱いたくなったときのために列は残してある）。
- 生活費は「毎月の既定額（`settings.default_budget_yen`）」と「その月だけの上書き（`budgets`）」の2階建て。**毎月ほぼ同じ額**という前提なので、上書きが無い月は既定額にフォールバックする。月を開いただけでは行を作らない（読み取りで書き込まない）。
- カテゴリは食費・日用品・外食・交通費・娯楽の5つが初期値。増やしたり名前や色を変えたりは `/categories` からできる。
- UI はスマホ利用が前提。色の選択のような操作はインラインではなくモーダル（画面下のシート）で出し、タップ対象は十分な大きさを取る。
- カテゴリの色は hex ではなく**スロット名**（`blue` / `orange` など8枠）で保存する。実際の色はライト・ダークで別々に検証済みの値を `globals.css` の `--cat-*` に持たせており、DB は「どの枠か」だけを知っている。色を足したり変えたりするときは、必ず両モードで検証し直すこと。
- テーマ色（ボタン・リンク・フォーカスリング）は `--accent` 系の CSS 変数に集約してある。ライトとダークで値が違うのは、白文字を載せられる濃さと暗背景で読める明るさが両立しないため。変えるときは WCAG コントラストを実測すること（面の上の文字は 4.5:1 以上）。`--accent-wash` に `color-mix` を使わないのは、非対応ブラウザ向けのフォールバックが不透明色になって文字が沈むから。
- テーマ色はオレンジだが、これはデータの色ではない。カテゴリの色（`--cat-*`）と役割が重ならないよう、テーマ色はボタンとリンクにだけ、カテゴリ色はバーとドットにだけ使うこと。
- 色だけで意味を伝えない。ライトモードでは青緑・黄・ピンクが背景とのコントラスト3:1未満なので、色を使う箇所には必ずカテゴリ名を併記する。
