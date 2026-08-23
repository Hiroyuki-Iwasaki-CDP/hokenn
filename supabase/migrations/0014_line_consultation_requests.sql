-- LINEの「担当者に相談」から受け付けた最新の未対応相談を、担当FP本人だけが確認できるようにする。
-- メッセージ本文は保存せず、受付日時と対応状態だけを保持する。

create table public.line_consultation_requests (
  customer_user_id uuid primary key references public.users (id) on delete cascade,
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'resolved')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  updated_at timestamptz not null default now(),
  check (customer_user_id <> advisor_user_id)
);

comment on table public.line_consultation_requests is
  'LINEの相談ボタンから受け付けた最新状態。相談本文や保険情報は保存しない。';

create index idx_line_consultations_advisor_status
  on public.line_consultation_requests (advisor_user_id, status, requested_at desc);

create trigger trg_line_consultation_requests_updated_at
  before update on public.line_consultation_requests
  for each row execute function public.set_updated_at();

alter table public.line_consultation_requests enable row level security;

grant select on public.line_consultation_requests to authenticated;
grant update (status, resolved_at, updated_at) on public.line_consultation_requests to authenticated;

create policy "advisor_select_own_line_consultations" on public.line_consultation_requests
  for select using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );

create policy "advisor_resolve_own_line_consultations" on public.line_consultation_requests
  for update
  using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  )
  with check (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );
