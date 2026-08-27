-- 新規招待で作成した仮アカウントを識別し、承認前の招待取消時だけ安全に削除できるようにする。
-- 新規・未担当顧客の担当FP紐づけも、招待送信時ではなく契約者の承認時に行う。

alter table public.users
  add column invitation_provisioned boolean not null default false;

comment on column public.users.invitation_provisioned is
  'アプリの招待処理が新規作成した認証アカウント。未利用かつ有効な招待が無い場合だけ取消時の削除対象になる。';

create or replace function public.assign_customer_advisor(
  customer_uid uuid,
  new_advisor_uid uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed boolean := false;
begin
  if customer_uid is null or new_advisor_uid is null or customer_uid = new_advisor_uid then
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
    and advisor_id is null;

  changed := found;
  return changed;
end;
$$;

revoke all on function public.assign_customer_advisor(uuid, uuid) from public, anon, authenticated;
grant execute on function public.assign_customer_advisor(uuid, uuid) to service_role;

comment on column public.users.advisor_id is
  '顧客の現在の担当FP。契約者本人が新規招待または担当変更を承認した時に設定される。FP自身の行ではnull。';

