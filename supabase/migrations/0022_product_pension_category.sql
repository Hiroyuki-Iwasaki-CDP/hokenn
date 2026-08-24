-- 契約入力側の「年金保険」と商品カタログの分類を揃える。

alter table public.insurance_products
  drop constraint if exists insurance_products_category_check;

alter table public.insurance_products
  add constraint insurance_products_category_check
  check (category in ('life', 'medical', 'pension', 'auto', 'home', 'accident', 'business'));
