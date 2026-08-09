# わが家の保険(β版)

保険証券や契約内容を登録すると、誰の・何に備える・どの保険会社の・いくらの保障かを、カードや図で一目で把握できるWebアプリです。

**β版**として、招待された利用者がメールアドレスの認証コードでログインし、自分専用のダッシュボードで保険情報を管理できます。利用者ごとのデータは完全に分離されており、他の利用者の情報を見ることはできません。担当FP(ファイナンシャルプランナー)はアプリへのログイン権限を持たず、連絡先情報としてのみ登録されます。

> 本サービスはテスト提供中です。保険証券画像・病歴・口座情報・クレジットカード情報などの機密情報は登録しないでください。

## 特徴

- ダッシュボード: 保障分野ごとの「保障の全体像」、保険期間タイムライン、更新予定、加入している保険一覧
- 保険一覧: カード表示、対象者・保障分野・保険会社・契約状態での絞り込み
- 保険詳細・登録・編集: 対象者、保険会社、商品名、月額保険料、契約状態などを登録(確認画面あり)
- 保障を比べる: 同じ対象者・同じ分野の契約の月額保険料を比較表示(中立的な事実提示のみ)
- メールアドレスの認証コードによるログイン(招待制)
- 左メニューに担当FPの連絡先(公式LINE・電話・メール)を表示

## アーキテクチャ

```
ブラウザ(Vite + React SPA)
   │  fetch(credentials:"include") で同一オリジンの /api/* のみを呼ぶ
   │  Supabaseの鍵はブラウザに一切渡らない
   ▼
Vercel Serverless Functions (/api/**)
   │  httpOnly / Secure / SameSite=Lax Cookie でセッションを管理
   │  Cookieのアクセストークンをサーバーで検証し、userIdを確定させる
   │  userIdのJWTを付与したSupabaseクライアントでDB操作(RLSが二重に所有者を強制)
   ▼
Supabase (Postgres + Row Level Security + Auth[メールOTP, カスタムSMTP経由])
```

- フロントエンド: Vite / React 19 / React Router(BrowserRouter、`vercel.json`のrewritesでSPAフォールバック) / Tailwind CSS
- バックエンド: Vercel Serverless Functions(`/api/**`, Node.js)。BFF(Backend for Frontend)として、認証コードの送受信・セッションCookieの発行・データCRUDの窓口になる
- データベース・認証: Supabase(Postgres + Row Level Security + Supabase Auth のメールOTP)
- メール配信: Supabase Authのカスタム SMTP設定(Resend等)経由

## データ構造

`supabase/migrations/0001_init.sql` を参照。以下の4テーブルを基本とし、運用上必要な最小限の列・テーブルを追加しています。

- `users` — 認証済み顧客のプロフィール。`manage_scope`(自分のみ/家族も含める)・`terms_accepted_at`(利用規約等への同意記録)を追加
- `insurance_policies` — 顧客が登録した保険契約(証券画像・診断書等の機密情報は保存しない)
- `advisor_profiles` — 担当FPの連絡先情報。「相談受付状況」表示用に `is_accepting_inquiries` を追加
- `audit_logs` — 最小限の操作ログ(認証コード・トークン・証券番号全文・健康情報は記録しない)
- `rate_limit_events` — 認証コードの送信回数・試行回数の制限用。メールアドレス/IPはハッシュ化して記録する運用専用テーブル(顧客データではない)

全テーブルでRow Level Securityを有効化し、`insurance_policies` / `advisor_profiles` は `owner_user_id = auth.uid()` の行のみ操作可能です。`owner_user_id` はクライアントの送信値を一切信用せず、常にサーバーが認証セッションから確定させます。

## 認証フロー

1. `/login` でメールアドレスを送信 → `POST /api/auth/request-code`
   - サーバーが送信回数・再送間隔を制限し、Supabase Authに招待済みメールアドレスのみコードを送信させる(未招待でも常に同一のレスポンスを返し、登録有無を推測させない)
2. `/login/verify` で6桁の認証コードを入力 → `POST /api/auth/verify-code`
   - 試行回数を制限。成功するとhttpOnly/Secure/SameSite=LaxのCookieにセッションを保存し、初回ログイン時は`/onboarding`へ、それ以外はダッシュボードへ遷移する
3. 以降の全APIはCookieを自動送信し、サーバー側でセッションを検証してユーザーIDを確定する(クライアントからの申告は信用しない)
4. セッションは最大14日で失効し、再度メールの認証コードでのログインが必要になる
5. ログアウトはSupabase側でリフレッシュトークンを無効化しCookieを削除する

## セキュリティ対策

- 認証: Supabase Auth のメールOTP(独自認証をゼロから実装しない)。招待制(Supabaseダッシュボードで招待したメールアドレスのみログイン可能)
- セッション: httpOnly / Secure / SameSite=Lax Cookie。Supabaseの鍵はブラウザに渡さない
- データ分離: アプリ層(APIが常にセッションのuserIdで絞り込み)+ DB層(Row Level Security)の二重防御。初期状態は全拒否
- レート制限: 認証コードの送信回数・再送間隔・入力試行回数をサーバー側で制限(`rate_limit_events`テーブル)
- CSRF対策: SameSite=Lax Cookie + 状態変更リクエストのOriginヘッダー検証
- XSS/インジェクション対策: Reactの自動エスケープ、Supabaseクライアントによるパラメータ化クエリ、zodによる入力検証、CSP等のセキュリティヘッダー(`vercel.json`)
- ログ: 認証コード・セッション・証券番号全文・健康情報は一切ログ・監査ログに出力しない
- 秘密情報: APIキー・service roleキーはVercelの環境変数にのみ保存し、コード・Gitには含めない。service roleキーはブラウザへ一切渡さない
- 削除: 保険の個別削除はソフトデリート、退会(アカウント削除)は`auth.users`の完全削除に伴いカスケードで即時に完全削除される

詳細は各実装ファイルのコメントも参照してください。

## セットアップ

### 1. Supabaseプロジェクトの準備

1. [Supabase](https://supabase.com/)でプロジェクトを作成する
2. `Project Settings > API` から `Project URL` / `anon public key` / `service_role key` を控える(service_role keyは絶対に公開しない)
3. `Authentication > Sign In / Providers > Email` でメールOTPを有効化し、`Allow new users to sign up`(自己登録)を**無効化**する(招待制にするため)
4. `Authentication > Emails` で「Email OTP Expiration」を短め(例: 10分)に設定する
5. `Authentication > SMTP Settings` に Resend 等のカスタムSMTPを設定する(Supabase標準メールは送信回数の制限が厳しいため、複数人でのテストには不向き)
6. SQL Editor(または Supabase CLI)で `supabase/migrations/0001_init.sql` を実行する
7. `Authentication > Users` で、招待したいテスターのメールアドレスを `Invite user` から追加する(このアプリには招待用の画面は無く、Supabaseダッシュボードから直接行う)

### 2. 環境変数

`.env.example` を参考に、以下の環境変数を用意する(値はコード・Gitに含めない)。

| 変数名 | 用途 |
| --- | --- |
| `SUPABASE_URL` | SupabaseのProject URL |
| `SUPABASE_ANON_KEY` | Supabaseのanon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのservice role key(サーバーのみで使用) |
| `RATE_LIMIT_HASH_SECRET` | レート制限記録のメール/IPハッシュ化用の秘密鍵(`openssl rand -hex 32`等で生成) |
| `ALLOWED_ORIGIN` | 本番公開URL。CSRF対策のOriginチェックに使用 |

ローカル開発では `.env.local` にコピーして使う(`.gitignore`済み)。

### 3. ローカル開発

```bash
npm install
npm run dev          # フロントエンドのみ(http://localhost:5173、/api はモックされない)
```

`/api/**` を含めて動作確認する場合は [Vercel CLI](https://vercel.com/docs/cli) を使う。

```bash
npm install -g vercel
vercel link           # 初回のみ、Vercelプロジェクトと連携
vercel env pull .env.local   # Vercel側に設定済みの環境変数を取得(先にダッシュボードで設定しておく)
vercel dev
```

### 4. デプロイ(Vercel)

1. [Vercel](https://vercel.com/)でこのリポジトリをインポートする(Frameworkは自動検出されるVite設定のままでよい)
2. Vercelプロジェクトの `Settings > Environment Variables` に上記の環境変数をすべて設定する(Production環境)
3. `main` ブランチへのpushで自動デプロイされる
4. デプロイ後に発行されるURL(例: `https://xxxx.vercel.app`)を `ALLOWED_ORIGIN` に設定し直し、再デプロイする
5. 独自ドメインは初回テストでは必須ではない

### 5. テスターの招待

1. Supabaseダッシュボード `Authentication > Users > Invite user` でテスターのメールアドレスを追加する
2. テスターに本番URLを共有する
3. テスターはメールアドレスを入力 → 届いた6桁の認証コードを入力してログインする

## テスト

### 自動チェック(所有者分離・認可)

`scripts/security-check.mjs` は、実際に動いているAPIに対して直接HTTPリクエストを送り、顧客ごとのデータ分離・認可・レート制限を検証するスクリプトです。ローカル/ステージング専用で、テスト専用のメールアドレスのみを使い、最後に作成したテストアカウントを削除します。

```bash
vercel dev &                      # 別ターミナルで実行しておく
BASE_URL=http://localhost:3000 node --env-file=.env.local scripts/security-check.mjs
```

本番環境に対して再テストする場合は `BASE_URL` と `ALLOWED_ORIGIN` を本番URLに変更して実行する。

検証項目:

- 未ログイン状態でAPIを呼べない(401)
- 顧客Aが顧客Bの保険を一覧・詳細で閲覧できない
- 顧客Aが顧客Bの契約IDを指定しても取得・更新・削除できない(404)
- 認証コードは再利用できない
- ログアウト後は同じCookieで保護APIへアクセスできない
- 認証コードの送信・入力試行を繰り返すとレート制限(429)がかかる

認証コードの「有効期限切れ」は実際の有効期限まで待つ必要があるため、このスクリプトには含めていません。手動で時間をおいて確認してください。

### 手動確認

- 担当FPの連絡先が未設定の場合、該当ボタンが表示されないこと(`/settings` で一部の連絡先のみ入力して確認)
- スマートフォン実機・ブラウザのレスポンシブ表示でレイアウトが崩れないこと

## ビルド

```bash
npm run build   # 型チェック(フロントエンド + /api) + 本番ビルド
npm run lint
```

## 削除済みデータの取り扱い

- 保険を1件削除する操作(`DELETE /api/policies/:id`)はソフトデリート(`deleted_at`を設定)。物理削除は行わず、`supabase/migrations/0001_init.sql` にコメントで残した `pg_cron` ジョブ(要Supabaseダッシュボードでの有効化)で一定期間後にパージできる
- 退会(`POST /api/account/delete`)は `auth.users` を完全に削除し、外部キーの `ON DELETE CASCADE` により顧客データ(保険・担当者情報)も即座に完全削除される。二度と同じメールアドレスでログインできなくなる
- `audit_logs.owner_user_id` は `ON DELETE SET NULL` のため、個人を特定できない形の操作履歴のみが残る

## 残っているリスク・既知の制約

- **バックアップ**: Supabaseの無料プランには自動バックアップ/PITRが無い。β版の間はデータ量が少ないため許容しているが、本格運用前に有料プランへの切り替え、または `pg_dump` を使った定期バックアップの仕組み化を推奨する
- **メール到達性**: カスタムSMTP(Resend等)を設定しない場合、Supabase標準メールの送信数制限により複数人での同時テストが難しい
- **依存パッケージの脆弱性**: `@vercel/node`(開発時のみ使用するビルドツール)が内部で依存する一部パッケージ(esbuild/undici等)に上流未修正の脆弱性が`npm audit`で報告される。いずれも本番の関数コードには含まれない開発時専用の依存であり、CIでは記録のみ行い失敗はさせていない。定期的に `npm audit` を確認すること
- **認証コード有効期限のテスト**: 自動テストでは検証していない(手動確認が必要)
- **監査ログの閲覧画面**: 未実装(`audit_logs`テーブル自体とAPI経由での記録は実装済み)

## 注意事項

このアプリは保険・法律・税務上の助言を行うものではありません。ご契約内容の確認は保険証券や保険会社にお問い合わせください。
