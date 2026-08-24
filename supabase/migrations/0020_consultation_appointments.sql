-- 契約者が担当代理店へ送る、相談日時候補つきの面談申込み。
-- 保険証券番号・病歴・相談本文などの機密情報は保存せず、相談テーマと日時候補だけを扱う。

create table public.consultation_appointments (
  id uuid primary key default gen_random_uuid(),
  customer_user_id uuid not null references public.users (id) on delete cascade,
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  topic text not null check (topic in ('review', 'renewal', 'family', 'premium', 'other')),
  first_choice_at timestamptz not null,
  second_choice_at timestamptz,
  confirmed_start_at timestamptz,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'completed', 'cancelled')),
  requested_at timestamptz not null default now(),
  confirmed_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  check (customer_user_id <> advisor_user_id),
  check (second_choice_at is null or second_choice_at <> first_choice_at),
  check (
    (status = 'requested' and confirmed_start_at is null and confirmed_at is null and completed_at is null and cancelled_at is null)
    or (status = 'confirmed' and confirmed_start_at is not null and confirmed_at is not null and completed_at is null and cancelled_at is null)
    or (status = 'completed' and confirmed_start_at is not null and confirmed_at is not null and completed_at is not null and cancelled_at is null)
    or (status = 'cancelled' and completed_at is null and cancelled_at is not null)
  )
);

comment on table public.consultation_appointments is
  '契約者から担当代理店への相談申込み。相談テーマと日時候補のみを保存し、自由記述や機密情報は扱わない。';

create unique index idx_consultation_appointments_one_active_customer
  on public.consultation_appointments (customer_user_id)
  where status in ('requested', 'confirmed');

create index idx_consultation_appointments_advisor_status
  on public.consultation_appointments (advisor_user_id, status, requested_at desc);

create trigger trg_consultation_appointments_updated_at
  before update on public.consultation_appointments
  for each row execute function public.set_updated_at();

alter table public.consultation_appointments enable row level security;

grant select, insert on public.consultation_appointments to authenticated;
grant update (status, confirmed_start_at, confirmed_at, completed_at, cancelled_at, updated_at)
  on public.consultation_appointments to authenticated;

create policy "consultation_appointments_select_participants" on public.consultation_appointments
  for select using (
    customer_user_id = (select auth.uid())
    or (
      advisor_user_id = (select auth.uid())
      and public.is_advisor((select auth.uid()))
    )
  );

create policy "consultation_appointments_insert_customer" on public.consultation_appointments
  for insert with check (
    customer_user_id = (select auth.uid())
    and advisor_user_id = (
      select u.advisor_id from public.users u where u.id = (select auth.uid())
    )
    and status = 'requested'
    and first_choice_at > now()
    and public.is_advisor(advisor_user_id)
  );

create policy "consultation_appointments_cancel_customer" on public.consultation_appointments
  for update
  using (customer_user_id = (select auth.uid()) and status in ('requested', 'confirmed'))
  with check (customer_user_id = (select auth.uid()) and status = 'cancelled');

create policy "consultation_appointments_update_advisor" on public.consultation_appointments
  for update
  using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  )
  with check (
    advisor_user_id = (select auth.uid())
    and status in ('confirmed', 'completed', 'cancelled')
    and public.is_advisor((select auth.uid()))
  );
