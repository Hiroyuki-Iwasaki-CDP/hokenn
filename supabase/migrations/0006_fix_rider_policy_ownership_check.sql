-- 直接DBを叩いての検証で発見: policy_riders の insert/update ポリシーは
-- owner_user_id = auth.uid() だけを見ており、policy_id が「本当に自分の保険か」を
-- 検証していなかった。アプリのAPI経由では常に確認済みのpolicy_idしか渡さないため
-- 実害はなかったが、RLSを「アプリのバグに関わらず機能する最終防衛線」として
-- 機能させるため、policy_id の所有者も併せて検証するよう強化する。

alter policy "riders_insert_own" on public.policy_riders
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.owner_user_id = (select auth.uid())
    )
  );

alter policy "riders_update_own" on public.policy_riders
  using (owner_user_id = (select auth.uid()))
  with check (
    owner_user_id = (select auth.uid())
    and exists (
      select 1 from public.insurance_policies p
      where p.id = policy_id and p.owner_user_id = (select auth.uid())
    )
  );
