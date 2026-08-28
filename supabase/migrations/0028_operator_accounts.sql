-- 運営者がSupabase管理画面を直接触らず、FPアカウントを追加・停止できるようにする。
-- 顧客/FPのroleはそのまま維持し、運営権限を独立したフラグとして重ねる。

alter table public.users
  add column is_operator boolean not null default false,
  add column is_active boolean not null default true;

comment on column public.users.is_operator is
  'FPアカウント管理を行える運営権限。roleとは独立し、運営兼FPを許可する。';

comment on column public.users.is_active is
  'falseの場合は認証済みでも全アプリAPIを拒否する。運営者によるFP利用停止に使用する。';

create index idx_users_active_advisors
  on public.users (created_at desc)
  where role = 'advisor' and deleted_at is null;

-- 認証済み本人がRLS経由で自分の行を更新できても、権限・役割・担当紐づけは変更できない。
create or replace function public.protect_user_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and (
    new.role is distinct from old.role
    or new.advisor_id is distinct from old.advisor_id
    or new.is_operator is distinct from old.is_operator
    or new.is_active is distinct from old.is_active
    or new.invitation_provisioned is distinct from old.invitation_provisioned
  ) then
    raise exception 'privileged user columns cannot be changed by the current user';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protect_user_privileged_columns on public.users;
create trigger trg_protect_user_privileged_columns
  before update on public.users
  for each row execute function public.protect_user_privileged_columns();

-- 初期運営者。既存のFP権限を維持したまま運営権限だけを追加する。
update public.users
set is_operator = true
where lower(email) = 'h.iwasaki@iwasaki-kikakusha.com'
  and role = 'advisor'
  and deleted_at is null;

