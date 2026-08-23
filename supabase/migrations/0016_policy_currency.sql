-- 既存契約はすべて円建てとして維持し、新規・編集時にドル建てを選択できるようにする。
alter table public.insurance_policies
  add column if not exists currency text not null default 'JPY';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'insurance_policies_currency_check'
      and conrelid = 'public.insurance_policies'::regclass
  ) then
    alter table public.insurance_policies
      add constraint insurance_policies_currency_check check (currency in ('JPY', 'USD'));
  end if;
end $$;

-- 取得元の日付も保持し、画面で「いつのレートか」を明示できるようにする。
alter table public.exchange_rates
  add column if not exists source text not null default 'Frankfurter',
  add column if not exists source_date date;
