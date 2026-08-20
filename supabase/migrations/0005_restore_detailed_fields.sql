-- β版で省略していた詳細項目を復活させる。
-- 現時点で本番に実データを持つ顧客がいないため、破壊的変更(列名変更含む)を安全に行える。

-- monthly_premium は「常に月額」という前提だったが、支払頻度(月払/年払/一時払い)を
-- 復活させるため、入力されたそのままの金額を持つ premium_amount にリネームする。
-- 月額換算はアプリ側(lib/calculations.ts)で行う。
alter table public.insurance_policies rename column monthly_premium to premium_amount;

alter table public.insurance_policies
  add column contractor_name text,
  add column beneficiary text,
  add column main_contract_name text,
  add column coverage_amount numeric(14, 0),
  add column hospitalization_daily numeric(12, 0),
  add column surgery_benefit numeric(12, 0),
  add column diagnosis_benefit numeric(12, 0),
  add column premium_frequency text not null default 'monthly'
    check (premium_frequency in ('monthly', 'yearly', 'single')),
  add column contract_type text
    check (contract_type in ('renewal', 'wholelife', 'termFixed', 'singlePayment')),
  add column maturity_date date,
  add column coverage_end_age integer,
  add column premium_end_date date,
  add column premium_end_age integer,
  add column has_cash_value boolean not null default false,
  add column cash_value_note text,
  add column agent_name text,
  add column contact_info text,
  add column attachment_names text[] not null default '{}';

comment on column public.insurance_policies.attachment_names is
  'ファイル名のみを保存する(ファイル本体は一切保存しない)。β版では証券画像等の機密情報は登録しない前提。';

-- ---------------------------------------------------------------------------
-- policy_riders: 保険1件につき複数登録できる特約
-- ---------------------------------------------------------------------------
create table public.policy_riders (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid not null references public.insurance_policies (id) on delete cascade,
  -- insurance_policiesと同様、owner_user_idを冗長に持たせてRLSをシンプル・高速に保つ。
  owner_user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  active boolean not null default true,
  amount numeric(12, 0),
  note text,
  created_at timestamptz not null default now()
);

create index idx_policy_riders_policy on public.policy_riders (policy_id);
create index idx_policy_riders_owner on public.policy_riders (owner_user_id);

alter table public.policy_riders enable row level security;

create policy "riders_select_own" on public.policy_riders
  for select using (owner_user_id = (select auth.uid()));

-- owner_user_id だけでなく、policy_id が指す保険も自分の所有であることを検証する
-- (owner_user_idの詐称は防げても、他人の保険IDへの付け替えまでは防げないため)。
create policy "riders_insert_own" on public.policy_riders
  for insert with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.owner_user_id = (select auth.uid())
    )
  );

create policy "riders_update_own" on public.policy_riders
  for update using (owner_user_id = (select auth.uid())) with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.owner_user_id = (select auth.uid())
    )
  );

create policy "riders_delete_own" on public.policy_riders
  for delete using (owner_user_id = (select auth.uid()));
