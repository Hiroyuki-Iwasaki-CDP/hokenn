-- supabase db advisors で検出した2件を修正。

-- 1. is_advisor() が anon(未ログイン)ロールからも実行可能だった。
--    Supabaseはデフォルトでpublicスキーマの関数にanon/authenticatedへEXECUTEを
--    付与しているため、REVOKE ALL FROM PUBLIC だけでは不十分だった。
revoke execute on function public.is_advisor(uuid) from anon;
revoke execute on function public.is_advisor(uuid) from public;
grant execute on function public.is_advisor(uuid) to authenticated;

-- 2. users / advisor_profiles で「自分の行」ポリシーと「紐づく相手の行」ポリシーが
--    それぞれ独立したpermissiveポリシーになっており、クエリのたびに両方評価される
--    非効率な状態だった(結果は変わらない)。1つのポリシーにOR条件でまとめる。

drop policy if exists "users_select_own" on public.users;
drop policy if exists "advisor_select_own_clients" on public.users;
create policy "users_select_own_or_advisor_clients" on public.users
  for select using (
    id = (select auth.uid())
    or (advisor_id = (select auth.uid()) and public.is_advisor((select auth.uid())))
  );

drop policy if exists "advisor_select_own" on public.advisor_profiles;
drop policy if exists "advisor_select_by_linked_client" on public.advisor_profiles;
create policy "advisor_select_own_or_linked_client" on public.advisor_profiles
  for select using (
    owner_user_id = (select auth.uid())
    or exists (
      select 1 from public.users u
      where u.id = (select auth.uid()) and u.advisor_id = advisor_profiles.owner_user_id
    )
  );
