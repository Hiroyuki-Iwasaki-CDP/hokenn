-- 契約者が、現在の担当FP（代理店窓口）へ全保険情報の閲覧を明示的に許可できるようにする。
--
-- 設計上の重要事項:
--   - 初期状態は共有なし。担当FPとして紐づいているだけでは保険情報を読めない。
--   - 共有は契約者本人だけが付与・解除できる。
--   - 担当FPは閲覧のみ。insurance_policies / policy_riders の更新・削除権限は追加しない。
--   - 解除履歴を残すため物理削除せず revoked_at を設定する。

create table public.policy_sharing_consents (
  customer_user_id uuid primary key references public.users (id) on delete cascade,
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  scope text not null default 'full' check (scope = 'full'),
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  check (customer_user_id <> advisor_user_id)
);

comment on table public.policy_sharing_consents is
  '契約者が現在の担当FPへ全保険情報の読み取りを許可した同意記録。revoked_atがnullのときのみ有効。';

create index idx_policy_sharing_consents_active_advisor
  on public.policy_sharing_consents (advisor_user_id, customer_user_id)
  where revoked_at is null;

create trigger trg_policy_sharing_consents_updated_at
  before update on public.policy_sharing_consents
  for each row execute function public.set_updated_at();

alter table public.policy_sharing_consents enable row level security;

-- Supabaseの新規テーブル自動公開設定に依存せず、必要な操作だけを明示的に付与する。
-- DELETEは付与しない（解除履歴を保持するため）。
grant select, insert, update on public.policy_sharing_consents to authenticated;

-- 契約者本人と、同意先の担当FPだけが同意状態を確認できる。
create policy "policy_sharing_select_participants" on public.policy_sharing_consents
  for select using (
    customer_user_id = (select auth.uid())
    or (
      advisor_user_id = (select auth.uid())
      and public.is_advisor((select auth.uid()))
    )
  );

-- 契約者は、自分に現在紐づいている担当FPに対してのみ同意を作成できる。
create policy "policy_sharing_insert_customer" on public.policy_sharing_consents
  for insert with check (
    customer_user_id = (select auth.uid())
    and advisor_user_id = (
      select u.advisor_id
      from public.users u
      where u.id = (select auth.uid())
    )
    and public.is_advisor(advisor_user_id)
  );

-- 付与・解除・担当変更時の同意先更新も契約者本人だけに限定する。
create policy "policy_sharing_update_customer" on public.policy_sharing_consents
  for update
  using (customer_user_id = (select auth.uid()))
  with check (
    customer_user_id = (select auth.uid())
    and (
      -- 担当変更・紐づけ解除後でも、過去の同意を確実に解除できる。
      revoked_at is not null
      or (
        advisor_user_id = (
          select u.advisor_id
          from public.users u
          where u.id = (select auth.uid())
        )
        and public.is_advisor(advisor_user_id)
      )
    )
  );

-- ポリシーから再利用する共有判定。呼び出した担当FP本人に対する有効な同意だけを返す。
-- SECURITY DEFINERでRLS再帰を避けるが、auth.uid()を内部で固定するため他者になり替わった
-- 判定には利用できない。
create or replace function public.has_active_full_policy_share(customer_uid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.policy_sharing_consents c
    join public.users customer on customer.id = c.customer_user_id
    where c.customer_user_id = customer_uid
      and c.advisor_user_id = (select auth.uid())
      and customer.advisor_id = c.advisor_user_id
      and c.scope = 'full'
      and c.revoked_at is null
      and public.is_advisor((select auth.uid()))
  );
$$;

revoke execute on function public.has_active_full_policy_share(uuid) from anon;
revoke execute on function public.has_active_full_policy_share(uuid) from public;
grant execute on function public.has_active_full_policy_share(uuid) to authenticated;

-- 所有者本人、または本人から現在有効な全件共有を受けた担当FPだけが閲覧できる。
drop policy if exists "policies_select_own" on public.insurance_policies;
create policy "policies_select_own_or_shared_advisor" on public.insurance_policies
  for select using (
    owner_user_id = (select auth.uid())
    or public.has_active_full_policy_share(owner_user_id)
  );

drop policy if exists "riders_select_own" on public.policy_riders;
create policy "riders_select_own_or_shared_advisor" on public.policy_riders
  for select using (
    owner_user_id = (select auth.uid())
    or public.has_active_full_policy_share(owner_user_id)
  );
