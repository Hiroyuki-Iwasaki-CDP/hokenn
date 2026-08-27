-- 既存顧客の担当FP変更は、招待を受け取った契約者本人が承認した時だけ実行する。
-- 招待時点の担当FPを記録し、承認までに担当が変わっていた場合は処理を止める。

alter table public.customer_invitations
  add column invitation_kind text not null default 'registration'
    check (invitation_kind in ('registration', 'transfer')),
  add column previous_advisor_user_id uuid references public.users (id) on delete set null;

alter table public.customer_invitations
  add constraint customer_invitations_transfer_context_check check (
    (invitation_kind = 'registration' and previous_advisor_user_id is null)
    or
    (
      invitation_kind = 'transfer'
      and previous_advisor_user_id is not null
      and previous_advisor_user_id <> advisor_user_id
    )
  );

comment on column public.customer_invitations.invitation_kind is
  'registrationは新規・未担当顧客の登録、transferは契約者承認を要する担当FP変更。';

comment on column public.customer_invitations.previous_advisor_user_id is
  '担当変更の招待作成時点の担当FP。承認時の競合確認に使い、現在の担当が変わっていれば変更しない。';

comment on column public.users.advisor_id is
  '顧客の現在の担当FP。新規招待または契約者本人が承認した担当変更によって設定される。FP自身の行ではnull。';

-- service_roleからのみ呼び出す、担当変更に伴う関連データの一括更新。
-- 新しい担当FPには保険情報を自動共有せず、旧担当FPへの同意だけを解除する。
create or replace function public.transfer_customer_advisor(
  customer_uid uuid,
  new_advisor_uid uuid,
  expected_previous_advisor_uid uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed boolean := false;
begin
  if customer_uid is null
    or new_advisor_uid is null
    or expected_previous_advisor_uid is null
    or customer_uid = new_advisor_uid
    or new_advisor_uid = expected_previous_advisor_uid then
    return false;
  end if;

  if not exists (
    select 1 from public.users
    where id = new_advisor_uid and role = 'advisor' and deleted_at is null
  ) then
    return false;
  end if;

  update public.users
  set advisor_id = new_advisor_uid
  where id = customer_uid
    and role = 'customer'
    and deleted_at is null
    and advisor_id = expected_previous_advisor_uid;

  changed := found;
  if not changed then
    return false;
  end if;

  update public.policy_sharing_consents
  set revoked_at = now()
  where customer_user_id = customer_uid
    and advisor_user_id = expected_previous_advisor_uid
    and revoked_at is null;

  update public.consultation_appointments
  set status = 'cancelled', cancelled_at = now()
  where customer_user_id = customer_uid
    and advisor_user_id = expected_previous_advisor_uid
    and status in ('requested', 'confirmed');

  update public.line_consultation_requests
  set status = 'resolved', resolved_at = now()
  where customer_user_id = customer_uid
    and advisor_user_id = expected_previous_advisor_uid
    and status = 'open';

  return true;
end;
$$;

revoke all on function public.transfer_customer_advisor(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.transfer_customer_advisor(uuid, uuid, uuid) to service_role;
