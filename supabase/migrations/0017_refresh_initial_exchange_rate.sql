-- 本番公開時点のFrankfurter USD/JPYレート。以後は毎日18時のcronが更新する。
update public.exchange_rates
set rate = 158.85,
    source = 'Frankfurter',
    source_date = date '2026-08-24',
    updated_at = now()
where pair = 'USD_JPY';
