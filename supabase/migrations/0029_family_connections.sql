-- 契約者同士が本人承認のうえで、保険概要を相互に読み取り専用共有する家族連携。
-- 生の招待トークンはメールだけに含め、DBにはSHA-256ハッシュだけを保存する。

create table public.family_invitations (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.users (id) on delete cascade,
  invitee_user_id uuid references public.users (id) on delete set null,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (inviter_user_id <> invitee_user_id)
);

create index idx_family_invitations_inviter_created
  on public.family_invitations (inviter_user_id, created_at desc);

create index idx_family_invitations_active_email
  on public.family_invitations (inviter_user_id, lower(email), expires_at)
  where accepted_at is null and revoked_at is null;

create table public.family_connections (
  id uuid primary key default gen_random_uuid(),
  member_a_user_id uuid not null references public.users (id) on delete cascade,
  member_b_user_id uuid not null references public.users (id) on delete cascade,
  created_by_user_id uuid not null references public.users (id) on delete cascade,
  accepted_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (member_a_user_id < member_b_user_id),
  check (created_by_user_id in (member_a_user_id, member_b_user_id))
);

create unique index idx_family_connections_active_pair
  on public.family_connections (member_a_user_id, member_b_user_id)
  where revoked_at is null;

create index idx_family_connections_member_a
  on public.family_connections (member_a_user_id, created_at desc)
  where revoked_at is null;

create index idx_family_connections_member_b
  on public.family_connections (member_b_user_id, created_at desc)
  where revoked_at is null;

alter table public.family_invitations enable row level security;
alter table public.family_connections enable row level security;

-- 招待トークンや家族関係はブラウザから直接操作させず、認証・認可を行うAPIだけが扱う。
revoke all on table public.family_invitations from anon, authenticated;
revoke all on table public.family_connections from anon, authenticated;

comment on table public.family_connections is
  '本人承認済みの契約者間家族連携。保険データ自体のRLSは広げず、専用APIが安全な項目だけを返す。';
