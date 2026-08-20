-- 複数FP対応: FPが自分のアカウントでログインし、自分の顧客の招待・連絡先管理ができるようにする。
-- 重要: FPには顧客の「保険データの中身」へのアクセス権は一切与えない(氏名・メール・登録状況のみ)。

alter table public.users
  add column role text not null default 'customer' check (role in ('customer', 'advisor')),
  add column advisor_id uuid references public.users (id) on delete set null;

comment on column public.users.advisor_id is
  '顧客がどのFPに紐づいているか。FP自身の行では常にnull。FPは顧客を招待した時点で自動的に設定される。';

create index idx_users_advisor_id on public.users (advisor_id) where advisor_id is not null;

-- ---------------------------------------------------------------------------
-- users: FPが「自分が招待した顧客」の基本情報(氏名・メール・登録状況)のみ参照できるようにする。
-- 既存の users_select_own (id = auth.uid()) はそのまま。これは追加のポリシー。
-- サブクエリ内の `users` 参照は id = auth.uid() の自分の行に限定されるため、
-- 既存の users_select_own ポリシーの範囲内で解決できる(再帰的な権限拡大にはならない)。
-- ---------------------------------------------------------------------------
create policy "advisor_select_own_clients" on public.users
  for select using (
    advisor_id = (select auth.uid())
    and (select role from public.users u where u.id = (select auth.uid())) = 'advisor'
  );

-- ---------------------------------------------------------------------------
-- advisor_profiles: 顧客が「自分に紐づいたFP」のプロフィールを参照できるようにする(読み取りのみ)。
-- 編集は引き続き本人(FP自身、またはFP未設定の顧客が自分の行を手動管理)のみ。
-- ---------------------------------------------------------------------------
create policy "advisor_select_by_linked_client" on public.advisor_profiles
  for select using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.advisor_id = advisor_profiles.owner_user_id
    )
  );
