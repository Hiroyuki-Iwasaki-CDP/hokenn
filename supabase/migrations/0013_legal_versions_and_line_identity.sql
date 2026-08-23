-- 公開した規約・プライバシーポリシーの同意版と、LINE Loginで検証済みの
-- Provider単位ユーザー識別子を契約者アカウントへ保存する。

alter table public.users
  add column terms_version text,
  add column privacy_version text,
  add column line_user_id text,
  add column line_display_name text,
  add column line_linked_at timestamptz;

alter table public.users
  add constraint users_line_user_id_format
    check (line_user_id is null or line_user_id ~ '^U[0-9a-f]{32}$'),
  add constraint users_line_display_name_length
    check (line_display_name is null or char_length(line_display_name) <= 100);

create unique index users_line_user_id_unique
  on public.users (line_user_id)
  where line_user_id is not null;

comment on column public.users.line_user_id is
  '同一Provider内のLINE Login/Messaging APIで共通となるLINEプラットフォーム発行ユーザーID。';

comment on column public.users.line_display_name is
  'LINE連携時にopenid profileスコープから取得した表示名。連携状態の本人確認表示にのみ使用する。';
