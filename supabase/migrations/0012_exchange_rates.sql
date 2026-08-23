-- ドル建て保険を円換算して表示するための為替レート保管テーブル。
-- 顧客個人のデータではなく、アプリ全体で共有する運用データのため owner_user_id は持たない。
-- 更新は日次のcronジョブ(サービスロール経由)のみが行い、通常のクライアントからは読み取り専用。
create table public.exchange_rates (
  pair text primary key,
  rate numeric(14, 6) not null check (rate > 0),
  updated_at timestamptz not null default now()
);

alter table public.exchange_rates enable row level security;

create policy "exchange_rates_select_authenticated" on public.exchange_rates
  for select
  to authenticated
  using (true);

-- cronジョブが初回実行されるまでの間、円換算が未取得のまま表示が壊れないようにする暫定値。
insert into public.exchange_rates (pair, rate) values ('USD_JPY', 150.0);
