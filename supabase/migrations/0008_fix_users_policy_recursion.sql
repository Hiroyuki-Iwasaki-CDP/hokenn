-- 緊急修正: 0007で追加した advisor_select_own_clients ポリシーが、usersテーブルへの
-- 自己参照サブクエリ(「自分の行のroleを見に行く」)を含んでいたため、Postgresが
-- 「infinite recursion detected in policy for relation "users"」エラーを起こし、
-- ログイン時のusers行upsert(全ユーザー・全ログインで毎回実行される)が軒並み失敗していた。
--
-- 対策: SECURITY DEFINER関数でrole判定を行う。この関数はテーブル所有者の権限で実行され、
-- RLSを介さずに直接rowを見るため、呼び出し元のRLS評価と再帰しない
-- (Supabase/Postgresで自己参照ポリシーを書く際の標準的な回避策)。

create or replace function public.is_advisor(target_uid uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.users where id = target_uid and role = 'advisor'
  );
$$;

-- 顧客本人以外(anon/authenticated)には直接実行させず、ポリシー内部からのみ使う想定だが、
-- ポリシー評価時に呼び出せるよう authenticated ロールには実行権限を付与する。
revoke all on function public.is_advisor(uuid) from public;
grant execute on function public.is_advisor(uuid) to authenticated;

drop policy if exists "advisor_select_own_clients" on public.users;
create policy "advisor_select_own_clients" on public.users
  for select using (
    advisor_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );
