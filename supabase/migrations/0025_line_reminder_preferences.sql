-- 契約者が明示的に許可した場合だけ送る、LINEリマインド設定と配送履歴。
-- 配送履歴には通知本文・LINE ID・証券番号・金額を保存しない。

create table public.line_notification_preferences (
  user_id uuid primary key references public.users (id) on delete cascade,
  policy_milestone_reminders boolean not null default false,
  appointment_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

create trigger trg_line_notification_preferences_updated_at
  before update on public.line_notification_preferences
  for each row execute function public.set_updated_at();

alter table public.line_notification_preferences enable row level security;
grant select, insert on public.line_notification_preferences to authenticated;
grant update (policy_milestone_reminders, appointment_reminders, updated_at) on public.line_notification_preferences to authenticated;

create policy "line_notification_preferences_select_own" on public.line_notification_preferences
  for select using (user_id = (select auth.uid()));
create policy "line_notification_preferences_insert_own" on public.line_notification_preferences
  for insert with check (user_id = (select auth.uid()));
create policy "line_notification_preferences_update_own" on public.line_notification_preferences
  for update using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.line_reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  reminder_kind text not null check (reminder_kind in ('policy_milestone', 'appointment')),
  resource_key text not null check (char_length(resource_key) between 1 and 100),
  scheduled_for date not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'not_linked')),
  response_status integer check (response_status is null or response_status between 100 and 599),
  attempted_at timestamptz not null default now(),
  unique (user_id, reminder_kind, resource_key, scheduled_for),
  check (status = 'failed' or response_status is null)
);

comment on table public.line_reminder_deliveries is
  '契約者向けLINEリマインドの重複送信防止と配送結果。通知本文・LINE ID・機密情報は保存しない。';

create index idx_line_reminder_deliveries_user
  on public.line_reminder_deliveries (user_id, attempted_at desc);

alter table public.line_reminder_deliveries enable row level security;
grant select on public.line_reminder_deliveries to authenticated;
create policy "line_reminder_deliveries_select_own" on public.line_reminder_deliveries
  for select using (user_id = (select auth.uid()));
