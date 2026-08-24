-- 契約者が担当者の確定前に限り、相談テーマと日時候補を変更できるようにする。

grant update (topic, first_choice_at, second_choice_at)
  on public.consultation_appointments to authenticated;

create policy "consultation_appointments_reschedule_customer" on public.consultation_appointments
  for update
  using (customer_user_id = (select auth.uid()) and status = 'requested')
  with check (
    customer_user_id = (select auth.uid())
    and status = 'requested'
    and first_choice_at > now()
  );
