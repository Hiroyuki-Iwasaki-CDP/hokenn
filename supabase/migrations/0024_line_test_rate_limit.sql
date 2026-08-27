-- LINEテスト通知の連打によるMessaging API送信枠の消費を防ぐ。

alter table public.rate_limit_events
  drop constraint rate_limit_events_action_check;

alter table public.rate_limit_events
  add constraint rate_limit_events_action_check
    check (action in ('request_code', 'verify_code', 'line_test_notification'));
