-- Supabaseのセキュリティアドバイザー(supabase db advisors)で検出:
-- public.set_updated_at() の search_path が固定されておらず、search_path経由の
-- オブジェクト差し替え(なりすまし)に理論上悪用されうる状態だった。
-- 空のsearch_pathを明示的に設定し、常に完全修飾名でのみオブジェクトを解決するようにする。
alter function public.set_updated_at() set search_path = '';
