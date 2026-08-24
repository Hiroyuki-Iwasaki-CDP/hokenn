-- 保険の保障分野に年金保険を追加する。
alter table public.insurance_policies
  drop constraint if exists insurance_policies_category_check;

alter table public.insurance_policies
  add constraint insurance_policies_category_check check (
    category in (
      'death', 'medical', 'cancer', 'disability', 'nursingCare',
      'injury', 'auto', 'fire', 'liability', 'education', 'pension', 'other'
    )
  );
