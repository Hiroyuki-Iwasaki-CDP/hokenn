-- LINE通知本文や個人情報を保存せず、相談通知の送信成否だけを追跡する。
-- 担当者は自分の顧客に関する履歴だけを確認できる。

create table public.line_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.consultation_appointments (id) on delete cascade,
  customer_user_id uuid not null references public.users (id) on delete cascade,
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  event text not null check (event in ('appointment_requested', 'appointment_rescheduled', 'customer_cancelled', 'advisor_confirmed', 'advisor_cancelled')),
  recipient_role text not null check (recipient_role in ('customer', 'advisor')),
  status text not null check (status in ('sent', 'failed', 'not_linked')),
  response_status integer check (response_status is null or response_status between 100 and 599),
  attempted_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (customer_user_id <> advisor_user_id),
  check (status = 'failed' or response_status is null)
);

comment on table public.line_notification_deliveries is
  '相談LINE通知の配送結果。通知本文・LINEユーザーID・保険情報は保存しない。';

create index idx_line_notification_deliveries_advisor
  on public.line_notification_deliveries (advisor_user_id, attempted_at desc);

create index idx_line_notification_deliveries_unresolved
  on public.line_notification_deliveries (advisor_user_id, attempted_at desc)
  where status <> 'sent' and resolved_at is null;

alter table public.line_notification_deliveries enable row level security;

grant select on public.line_notification_deliveries to authenticated;
grant update (resolved_at) on public.line_notification_deliveries to authenticated;

create policy "line_notification_deliveries_select_advisor" on public.line_notification_deliveries
  for select using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );

create policy "line_notification_deliveries_resolve_advisor" on public.line_notification_deliveries
  for update
  using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  )
  with check (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );
