-- 「わが家の保険」β版 初期スキーマ
--
-- 設計方針:
--   - 全テーブルで Row Level Security を有効化し、ポリシーが無い状態(=全拒否)から出発する。
--   - 顧客データ(insurance_policies / advisor_profiles)は owner_user_id = (select auth.uid()) の行のみ
--     select/insert/update/delete を許可する。owner_user_id はクライアントの申告を一切信用せず、
--     常にサーバー(APIハンドラ)が認証セッションから確定させた値を使う。RLSはその最終防衛線。
--   - users は id = (select auth.uid()) の自分の行のみ。
--   - audit_logs には認証コード・セッション・証券番号全文・健康情報などの機密情報を記録しない。
--   - rate_limit_events はメールアドレス/IPを生のまま保持せずハッシュ化して記録する運用専用テーブル。
--     顧客データではないため、クライアント/顧客からの参照ポリシーは一切用意しない(サーバーのみが
--     service role で読み書きする)。

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- users: 認証済み顧客のプロフィール(auth.users と1:1)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text,
  -- 初回設定「自分のみ/家族も含める」。UI表示の出し分けにのみ使用する、指定スキーマへの最小限の追加。
  manage_scope text check (manage_scope in ('self', 'family')),
  -- 利用規約・機密情報非登録への同意記録(指定スキーマへの最小限の追加。法的な同意事実の保存のため)。
  terms_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

comment on table public.users is '認証済み顧客のプロフィール。担当FPはこのテーブルに行を持たない(ログイン権限なし)。';

-- ---------------------------------------------------------------------------
-- insurance_policies: 顧客が登録した保険契約
-- ---------------------------------------------------------------------------
create table public.insurance_policies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  insured_person_name text not null,
  category text not null check (
    category in (
      'death', 'medical', 'cancer', 'disability', 'nursingCare',
      'injury', 'auto', 'fire', 'liability', 'education', 'other'
    )
  ),
  insurance_company text not null,
  product_name text not null,
  -- 任意入力。一覧・詳細では下4桁以外をマスクして表示する(アプリ側の責務)。
  policy_number text,
  monthly_premium numeric(12, 0) not null default 0 check (monthly_premium >= 0),
  coverage_summary text,
  contract_date date,
  renewal_date date,
  status text not null default 'active' check (status in ('active', 'lapsed', 'cancelled', 'matured')),
  memo text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_insurance_policies_owner on public.insurance_policies (owner_user_id) where deleted_at is null;

comment on table public.insurance_policies is 'β版では証券画像・診断書・病歴・マイナンバー・口座情報等は一切保存しない。';

-- ---------------------------------------------------------------------------
-- advisor_profiles: 担当FPの連絡先情報(FP本人はログインしない、顧客が自分のアカウント内で編集する)
-- ---------------------------------------------------------------------------
create table public.advisor_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null unique references public.users (id) on delete cascade,
  advisor_name text,
  agency_name text,
  title text,
  phone text,
  email text,
  official_line_url text,
  contact_hours text,
  -- 相談受付状況の表示用(顧客が担当者から聞いた状況を自分で切り替える。指定スキーマへの最小限の追加)。
  is_accepting_inquiries boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- audit_logs: 最小限の操作ログ(機密情報は含めない)
-- ---------------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid references public.users (id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id text,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_owner on public.audit_logs (owner_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- rate_limit_events: OTP送信/検証のレート制限用(顧客データではない運用テーブル)
-- ---------------------------------------------------------------------------
create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  subject_hash text not null,
  action text not null check (action in ('request_code', 'verify_code')),
  created_at timestamptz not null default now()
);

create index idx_rate_limit_events_lookup on public.rate_limit_events (subject_hash, action, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at 自動更新
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create trigger trg_insurance_policies_updated_at
  before update on public.insurance_policies
  for each row execute function public.set_updated_at();

create trigger trg_advisor_profiles_updated_at
  before update on public.advisor_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: 有効化 + 最小権限ポリシー(初期状態は全拒否)
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.insurance_policies enable row level security;
alter table public.advisor_profiles enable row level security;
alter table public.audit_logs enable row level security;
alter table public.rate_limit_events enable row level security;

-- users: 自分の行のみ参照・更新可。挿入は自分のidでのみ(初回ログイン時にAPIが作成)。削除はRLS経由では不可
-- (退会はAPIがservice roleで auth.users ごと削除するため、通常操作からは行削除経路自体を与えない)。
create policy "users_select_own" on public.users
  for select using (id = (select auth.uid()));

create policy "users_insert_self" on public.users
  for insert with check (id = (select auth.uid()));

create policy "users_update_own" on public.users
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- insurance_policies: 完全に owner_user_id = (select auth.uid()) の行のみ
create policy "policies_select_own" on public.insurance_policies
  for select using (owner_user_id = (select auth.uid()));

create policy "policies_insert_own" on public.insurance_policies
  for insert with check (owner_user_id = (select auth.uid()));

create policy "policies_update_own" on public.insurance_policies
  for update using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

create policy "policies_delete_own" on public.insurance_policies
  for delete using (owner_user_id = (select auth.uid()));

-- advisor_profiles: 同様に owner_user_id = (select auth.uid()) の行のみ
create policy "advisor_select_own" on public.advisor_profiles
  for select using (owner_user_id = (select auth.uid()));

create policy "advisor_insert_own" on public.advisor_profiles
  for insert with check (owner_user_id = (select auth.uid()));

create policy "advisor_update_own" on public.advisor_profiles
  for update using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

-- audit_logs: 挿入・参照とも自分の行のみ(将来の「自分の操作履歴」表示に備える。今回のUIでは未使用)。
create policy "audit_select_own" on public.audit_logs
  for select using (owner_user_id = (select auth.uid()));

create policy "audit_insert_own" on public.audit_logs
  for insert with check (owner_user_id = (select auth.uid()));

-- rate_limit_events: 顧客向けポリシーは意図的に何も定義しない(=RLSにより全拒否)。
-- サーバーはこのテーブルの読み書きに SUPABASE_SERVICE_ROLE_KEY を使う(RLSをバイパスする唯一の用途)。

-- ---------------------------------------------------------------------------
-- 任意: 退会後30日を超えたソフトデリート行の自動パージ(pg_cron拡張が有効な場合のみ)
-- Supabaseダッシュボード > Database > Extensions で pg_cron を有効化した上でコメントを解除して実行してください。
-- ---------------------------------------------------------------------------
-- select cron.schedule(
--   'purge-soft-deleted-policies',
--   '0 3 * * *',
--   $$delete from public.insurance_policies where deleted_at is not null and deleted_at < now() - interval '30 days'$$
-- );
