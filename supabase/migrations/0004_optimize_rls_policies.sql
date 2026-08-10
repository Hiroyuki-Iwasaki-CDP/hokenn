-- Supabaseのパフォーマンスアドバイザー(supabase db advisors --type performance)で検出:
-- RLSポリシー内の auth.uid() が行ごとに再評価されており、大量行のスキャン時に非効率。
-- (select auth.uid()) の形にすることでPostgresがinitplanとして1回だけ評価するようになる。
-- 挙動(誰がアクセスできるか)は変わらない、純粋な性能改善。

alter policy "users_select_own" on public.users
  using (id = (select auth.uid()));

alter policy "users_insert_self" on public.users
  with check (id = (select auth.uid()));

alter policy "users_update_own" on public.users
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

alter policy "policies_select_own" on public.insurance_policies
  using (owner_user_id = (select auth.uid()));

alter policy "policies_insert_own" on public.insurance_policies
  with check (owner_user_id = (select auth.uid()));

alter policy "policies_update_own" on public.insurance_policies
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

alter policy "policies_delete_own" on public.insurance_policies
  using (owner_user_id = (select auth.uid()));

alter policy "advisor_select_own" on public.advisor_profiles
  using (owner_user_id = (select auth.uid()));

alter policy "advisor_insert_own" on public.advisor_profiles
  with check (owner_user_id = (select auth.uid()));

alter policy "advisor_update_own" on public.advisor_profiles
  using (owner_user_id = (select auth.uid())) with check (owner_user_id = (select auth.uid()));

alter policy "audit_select_own" on public.audit_logs
  using (owner_user_id = (select auth.uid()));

alter policy "audit_insert_own" on public.audit_logs
  with check (owner_user_id = (select auth.uid()));
