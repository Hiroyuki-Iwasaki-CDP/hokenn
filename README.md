# わが家の保険

保険証券や契約内容を登録すると、誰の・何に備える・どの保険会社の・いくらの保障かを、カードや図で一目で把握できるWebアプリです。

招待された利用者がメールアドレスの認証コードでログインし、自分専用のダッシュボードで保険情報を管理できます。利用者ごとのデータは完全に分離されています。担当FPは通常、顧客の保険情報を閲覧できませんが、契約者本人が明示的に全件共有を許可した場合だけ、担当顧客の登録情報を閲覧専用で確認できます。

> 安全のため、保険証券画像・病歴・口座情報・クレジットカード情報などの機密情報は登録しないでください。

## 特徴

- ダッシュボード: 保障分野ごとの「保障の全体像」、保険期間タイムライン、更新予定、加入している保険一覧
- 保険一覧: カード表示、対象者・保障分野・保険会社・契約状態での絞り込み
- 保険詳細・登録・編集: 対象者、保険会社、商品名、月額保険料、契約状態などを登録(確認画面あり)
- 保障を比べる: 同じ対象者・同じ分野の契約の月額保険料を比較表示(中立的な事実提示のみ)
- メールアドレスの認証コードによるログイン(招待制)
- 既存の契約者アカウントとLINEアカウントの安全な連携（OAuth 2.1 / OpenID Connect / PKCE）
- 契約者が明示的にONにした場合だけ、更新・満期30日前と確定相談前日にLINEリマインドを送信
- 左メニューに担当FPの連絡先(公式LINE・電話・メール)を表示
- 契約者本人による担当代理店への全保険情報の共有・解除(担当者は閲覧専用)
- 家族同士の招待・相互承認による保険概要の読み取り専用共有

## 公開ページ

- `/about` — 契約者・家族・代理店向けのサービス紹介LP
- `/manual` — 契約者、代理店・FP、運営者向けの使い方マニュアルとFAQ
- `/demo` — 架空データだけを使ったログイン不要の画面デモ
- `/privacy` / `/terms` — プライバシーポリシーと利用規約

LPとマニュアルからログイン・デモ・法務ページへ移動できます。本サービスは招待制のため、LPにはセルフ登録導線を設けていません。

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

- `users` — 認証済みユーザーのプロフィール。`role`(`customer`/`advisor`)・`advisor_id`(顧客が紐づく担当FP)・`manage_scope`(自分のみ/家族も含める)・`terms_accepted_at`(利用規約等への同意記録)を追加
- `insurance_policies` — 顧客が登録した保険契約(証券画像・診断書等の機密情報は保存しない)
- `advisor_profiles` — FP自身のプロフィール(FPアカウントに紐づく顧客からは読み取り専用で見える)。FP未設定の顧客は自分の行を手動管理するフォールバックとしても使う。「相談受付状況」表示用に `is_accepting_inquiries` を追加
- `audit_logs` — 最小限の操作ログ(認証コード・トークン・証券番号全文・健康情報は記録しない)
- `rate_limit_events` — 認証コードの送信回数・試行回数の制限用。メールアドレス/IPはハッシュ化して記録する運用専用テーブル(顧客データではない)
- `policy_sharing_consents` — 契約者が現在の担当FPへ全保険情報の閲覧を許可した同意記録。初期状態は未共有で、解除履歴も保持する
- `users.line_user_id` — 同一Provider内のLINE LoginとMessaging APIで共通するLINEユーザー識別子。LINEのトークンはDBへ保存しない
- `line_notification_deliveries` — 相談LINE通知の配送結果。通知本文やLINEユーザーIDは保存せず、送信成否だけを担当者が確認する
- `line_notification_preferences` / `line_reminder_deliveries` — 契約者のリマインド同意設定と重複送信防止用の配送結果。通知本文やLINEユーザーIDは保存しない
- `customer_invitations` — 新規登録と担当FP変更の一度限りの招待。担当変更は招待作成時点の担当FPも記録し、契約者本人の承認時だけ切り替える

全テーブルでRow Level Securityを有効化し、`insurance_policies` / `advisor_profiles` は `owner_user_id = auth.uid()` の行のみ操作可能です。`owner_user_id` はクライアントの送信値を一切信用せず、常にサーバーが認証セッションから確定させます。

## 複数FP対応

実際の複数のFPが、それぞれ自分の顧客を招待して使う運用に対応しています。

- **役割**: `users.role` が `customer`(既定値)か `advisor` かで顧客用画面(`/`)とFP用画面(`/advisor`)を完全に分離する。相互に行き来はできない
- **FPにできること**: 自分の顧客の招待(`POST /api/advisor/clients`)、自分の顧客一覧の閲覧(`GET /api/advisor/clients` — 氏名・メール・登録状況のみ)、自分自身のプロフィール編集(`/api/advisor`)
- **FPによる保険情報の閲覧**: 初期状態では閲覧不可。契約者本人が設定画面で「全保険情報の共有」を明示的に許可した場合だけ、自分の担当顧客の登録情報を閲覧専用で確認できる。編集・削除は常に不可で、契約者が共有を解除すると直ちに閲覧できなくなる
- **FPにできないこと**: 共有された保険情報の編集・削除、共有を許可していない顧客の保険情報の閲覧、他のFPの顧客の閲覧
- **顧客とFPの紐づけ**: 新規・未担当の顧客は、契約者本人が招待を承認した時に `users.advisor_id` が設定される。すでに別FPが担当している顧客も、契約者本人がメールの担当変更画面で承認した時だけ切り替わる。変更時は旧FPへの保険共有を解除し、未完了の相談・面談を終了する。新FPへの保険共有は自動では開始しない。紐づいた顧客のダッシュボードには、そのFPの `advisor_profiles` が自動表示される(`GET /api/my-advisor`)
- **FPアカウントの作成（運営画面）**: `users.is_operator = true` のFPは `/operator/advisors` から新しい担当者をメール招待し、利用停止・再開を行える。運営者自身と運営権限を持つ担当者は停止できない

以下の手動手順は、運営画面を利用できない場合の復旧用です。

- **FPアカウントの作成（手動復旧）**: セルフサインアップ画面は作らない。以下の手順で運用者が作成する
  1. Supabaseダッシュボード `Authentication > Users > Send invitation` でFPのメールアドレスを招待する
  2. SQL Editorで以下を実行し、`role` を `advisor` にする(招待直後、まだ`public.users`行が無い場合は自動的に作成される)

     ```sql
     insert into public.users (id, email, role)
     select id, email, 'advisor'
     from auth.users
     where email = 'fp@example.com'
     on conflict (id) do update set role = 'advisor';
     ```

  3. FP本人が `/login` からログインし、初期設定(表示名・規約同意)を済ませると `/advisor` のFP用ダッシュボードが使えるようになる

## 認証フロー

1. `/login` でメールアドレスを送信 → `POST /api/auth/request-code`
   - サーバーが送信回数・再送間隔を制限し、Supabase Authに招待済みメールアドレスのみコードを送信させる(未招待でも常に同一のレスポンスを返し、登録有無を推測させない)
2. `/login/verify` で6桁の認証コードを入力 → `POST /api/auth/verify-code`
   - 試行回数を制限。成功するとhttpOnly/Secure/SameSite=LaxのCookieにセッションを保存し、初回ログイン時は`/onboarding`へ、それ以外はダッシュボードへ遷移する
3. 以降の全APIはCookieを自動送信し、サーバー側でセッションを検証してユーザーIDを確定する(クライアントからの申告は信用しない)
4. セッションは最大14日で失効し、再度メールの認証コードでのログインが必要になる
5. ログアウトはSupabase側でリフレッシュトークンを無効化しCookieを削除する

### LINE連携

1. メール認証でログイン済みの契約者が、設定画面からLINE連携を開始する
2. サーバーが`state`・`nonce`・PKCE用の値を生成し、httpOnly Cookieへ10分間だけ保存する
3. LINE Loginの認可と公式アカウントの友だち追加後、`/api/auth/line/callback`で認可コードをアクセストークン・IDトークンへ交換する
4. LINEの検証APIでIDトークン、チャネルID、`nonce`を照合し、友だち関係も確認する。友だち追加済みの場合だけ検証済みの`sub`を`users.line_user_id`へ保存する
5. LINEアクセストークン、リフレッシュトークン、IDトークンは保存しない

連携後は、公式LINEのリッチメニューから`/line`を開き、LINE本人確認だけで既存のSupabaseセッションを発行できます。LINE IDが未連携の場合はログインを拒否し、招待済みメールアドレスによる初回ログインへ案内します。新規ユーザー作成や担当代理店への保険情報共有は自動では行わず、共有は契約者が別途明示的に許可する必要があります。

## セキュリティ対策

- 認証: Supabase Auth のメールOTP(独自認証をゼロから実装しない)。招待制(Supabaseダッシュボードで招待したメールアドレスのみログイン可能)
- セッション: httpOnly / Secure / SameSite=Lax Cookie。Supabaseの鍵はブラウザに渡さない
- データ分離: アプリ層(APIが常にセッションのuserIdで絞り込み)+ DB層(Row Level Security)の二重防御。初期状態は全拒否
- レート制限: 認証コードの送信回数・再送間隔・入力試行回数をサーバー側で制限(`rate_limit_events`テーブル)
- CSRF対策: SameSite=Lax Cookie + 状態変更リクエストのOriginヘッダー検証
- LINE Login: `state`・`nonce`・PKCEを使用し、LINEの検証APIでIDトークンをサーバー側検証。連携済みIDだけ既存ユーザーのセッションを発行し、LINEのトークンは永続保存しない
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
5. `Authentication > Emails > SMTP Settings`(または `Project Settings > Authentication`)に Resend 等のカスタムSMTPを設定する。**これは任意ではなく必須**: Supabase無料プランの標準メール送信では認証コードのメールテンプレートをカスタマイズできず(送信自体はできても6桁コードを画面に表示できない)、`supabase config push` がテンプレート更新で400エラーになる。カスタムSMTPを設定して初めてテンプレートが反映できる
6. SQL Editor(または Supabase CLI)で `supabase/migrations/` 配下のマイグレーションを順に実行する(`supabase db push` でまとめて適用可能)
7. `Authentication > Users` で、招待したいテスターのメールアドレスを `Invite user`(または `Send invitation`)から追加する(このアプリには招待用の画面は無く、Supabaseダッシュボードから直接行う)。**プロジェクト切り替えを間違えないよう、URLのプロジェクトrefが正しいことを毎回確認すること**(複数のSupabaseプロジェクトを持っている場合、誤って別プロジェクトに招待すると認証コードが届かない・意図しないページに遷移する等の問題が起きる)

### 2. 環境変数

`.env.example` を参考に、以下の環境変数を用意する(値はコード・Gitに含めない)。

| 変数名 | 用途 |
| --- | --- |
| `SUPABASE_URL` | SupabaseのProject URL |
| `SUPABASE_ANON_KEY` | Supabaseのanon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabaseのservice role key(サーバーのみで使用) |
| `RATE_LIMIT_HASH_SECRET` | レート制限記録のメール/IPハッシュ化用の秘密鍵(`openssl rand -hex 32`等で生成) |
| `ALLOWED_ORIGIN` | 本番公開URL。CSRF対策のOriginチェックに使用 |
| `VITE_OPERATOR_NAME` | プライバシーポリシー等に表示する運営者名（公開値） |
| `VITE_SUPPORT_EMAIL` | 公開する問い合わせメールアドレス（公開値） |
| `LINE_LOGIN_CHANNEL_ID` | LINE LoginチャネルID |
| `LINE_LOGIN_CHANNEL_SECRET` | LINE Loginチャネルシークレット（サーバーのみで使用） |
| `LINE_LOGIN_CALLBACK_URL` | `https://hokenn.vercel.app/api/auth/line/callback` |
| `LINE_MESSAGING_CHANNEL_SECRET` | Messaging APIのWebhook署名検証に使用するチャネルシークレット |
| `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` | 相談受付メッセージの返信に使用する長期チャネルアクセストークン |

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
5. LINE Developers ConsoleのLINE Loginチャネルで、コールバックURLに`https://hokenn.vercel.app/api/auth/line/callback`を登録する
6. Messaging APIチャネルのWebhook URLに`https://hokenn.vercel.app/api/webhooks/line`を登録し、検証成功後にWebhookを有効化する
6. 同チャネルのプライバシーポリシーURLに`https://hokenn.vercel.app/privacy`、利用規約URLに`https://hokenn.vercel.app/terms`を登録する
7. 独自ドメインは初回テストでは必須ではない

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

- 保険を1件削除する操作(`DELETE /api/policies/:id`)はソフトデリート(`deleted_at`を設定)。物理削除は行わず、`supabase/migrations/0002_pg_cron_purge.sql` で登録した `pg_cron` ジョブが毎日3時に30日経過分を完全削除する
- 退会(`POST /api/account/delete`)は `auth.users` を完全に削除し、外部キーの `ON DELETE CASCADE` により顧客データ(保険・担当者情報)も即座に完全削除される。二度と同じメールアドレスでログインできなくなる
- `audit_logs.owner_user_id` は `ON DELETE SET NULL` のため、個人を特定できない形の操作履歴のみが残る

## 残っているリスク・既知の制約

- **バックアップ**: Supabaseの無料プランには自動バックアップ/PITRが無い。本格運用前に有料プランへの切り替え、または `pg_dump` を使った定期バックアップの仕組み化を推奨する
- **メール到達性**: 本番プロジェクトはカスタムSMTP(Resend)設定済み・独自の認証コードメールテンプレート(`supabase/templates/magic_link.html`)反映済みで、実際のログインを確認済み。Resendの無料枠(目安: 1日100通)を超える利用が見込まれる場合は上位プランや独自ドメイン送信の検討が必要
- **依存パッケージの脆弱性**: `@vercel/node`(開発時のみ使用するビルドツール)が内部で依存する一部パッケージ(esbuild/undici等)に上流未修正の脆弱性が`npm audit`で報告される。いずれも本番の関数コードには含まれない開発時専用の依存であり、CIでは記録のみ行い失敗はさせていない。定期的に `npm audit` を確認すること
- **操作履歴画面**: 実装済み。ログイン中の本人が、自分の主な操作を最新100件まで確認できる。全利用者を横断する運営監査は、独立した運営者権限を追加してから実装する
- **セッションの絶対期限(サーバー側)**: `auth.sessions` の `timebox` はSupabase Proプラン以上が必要なため無料プランでは未設定。再認証の強制はBFF側のCookie有効期限(14日)のみで行っている

## 注意事項

このアプリは保険・法律・税務上の助言を行うものではありません。ご契約内容の確認は保険証券や保険会社にお問い合わせください。
