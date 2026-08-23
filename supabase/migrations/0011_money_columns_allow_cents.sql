-- 金額列はこれまで小数点以下0桁(整数)だった。ドル建て保険はセント単位の端数を持つため、
-- 小数点以下2桁まで保持できるようにする(円建てのみの既存データには影響しない)。
alter table public.insurance_policies
  alter column premium_amount type numeric(14, 2),
  alter column coverage_amount type numeric(16, 2),
  alter column hospitalization_daily type numeric(14, 2),
  alter column surgery_benefit type numeric(14, 2),
  alter column diagnosis_benefit type numeric(14, 2);

alter table public.policy_riders
  alter column amount type numeric(14, 2);
