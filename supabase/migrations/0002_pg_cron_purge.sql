-- ソフトデリートされた保険(insurance_policies.deleted_at)を、30日経過後に完全削除する定期ジョブ。
-- pg_cron拡張が利用できない環境では、このマイグレーション自体が失敗する可能性がある
-- (その場合はSupabaseダッシュボード Database > Extensions で pg_cron を有効化してから再実行する)。
create extension if not exists pg_cron with schema extensions;

select cron.schedule(
  'purge-soft-deleted-policies',
  '0 3 * * *',
  $$delete from public.insurance_policies where deleted_at is not null and deleted_at < now() - interval '30 days'$$
);
