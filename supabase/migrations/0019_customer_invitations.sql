-- 代理店から顧客へ送る、一度だけ利用できる登録リンク。
-- 生のトークンはメールにだけ含め、DBにはSHA-256ハッシュのみを保存する。

create table public.customer_invitations (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  customer_user_id uuid references public.users (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at),
  check (advisor_user_id <> customer_user_id)
);

create index idx_customer_invitations_advisor_created
  on public.customer_invitations (advisor_user_id, created_at desc);

create index idx_customer_invitations_active_email
  on public.customer_invitations (advisor_user_id, lower(email), expires_at)
  where accepted_at is null and revoked_at is null;

alter table public.customer_invitations enable row level security;

-- 招待トークンは認証前にも使われるため、ブラウザから直接参照させない。
-- 作成・検証・失効はサービスロールを使うAPIだけが行う。
revoke all on table public.customer_invitations from anon, authenticated;

