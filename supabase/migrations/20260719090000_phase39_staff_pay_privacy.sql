-- Phase 39: staff pay privacy.
--
-- The pilot removes every staff-facing pay surface. The portal pay estimate is
-- gone from the app, so the staff self-read path on `staff_pay_rates` is no
-- longer needed and is removed here. Pay rates and labour planning settings
-- become strictly manager-only data.
--
-- Additive migration: drops one policy; no table or grant changes. The
-- manager-only policy (`staff_pay_rates_manager_all`) remains the single
-- access path.

drop policy if exists staff_pay_rates_self_select on public.staff_pay_rates;

comment on table public.staff_pay_rates is
  'One current hourly rate per staff member for manager-side labour cost planning only. Staff have no read path. Not a payroll integration; payroll stays disabled.';

notify pgrst, 'reload schema';
