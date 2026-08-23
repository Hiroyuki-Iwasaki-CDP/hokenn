-- 代理店担当者が公開する取扱商品カタログ。
-- 公開ページには is_published=true の行だけを表示し、編集は登録した担当者本人に限定する。

create table public.insurance_products (
  id uuid primary key default gen_random_uuid(),
  advisor_user_id uuid not null references public.users (id) on delete cascade,
  category text not null check (category in ('life', 'medical', 'auto', 'home', 'accident', 'business')),
  insurer_name text not null check (char_length(insurer_name) between 1 and 100),
  product_name text not null check (char_length(product_name) between 1 and 150),
  summary text not null default '' check (char_length(summary) <= 500),
  official_url text check (official_url is null or (char_length(official_url) <= 500 and official_url ~ '^https://')),
  is_published boolean not null default false,
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_insurance_products_public
  on public.insurance_products (is_published, sort_order, created_at);

create trigger trg_insurance_products_updated_at
  before update on public.insurance_products
  for each row execute function public.set_updated_at();

alter table public.insurance_products enable row level security;

grant select on public.insurance_products to anon, authenticated;
grant insert, update, delete on public.insurance_products to authenticated;

create policy "published_products_are_public" on public.insurance_products
  for select using (
    is_published
    or (
      advisor_user_id = (select auth.uid())
      and public.is_advisor((select auth.uid()))
    )
  );

create policy "advisor_insert_own_products" on public.insurance_products
  for insert with check (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );

create policy "advisor_update_own_products" on public.insurance_products
  for update
  using (advisor_user_id = (select auth.uid()) and public.is_advisor((select auth.uid())))
  with check (advisor_user_id = (select auth.uid()) and public.is_advisor((select auth.uid())));

create policy "advisor_delete_own_products" on public.insurance_products
  for delete using (
    advisor_user_id = (select auth.uid())
    and public.is_advisor((select auth.uid()))
  );
