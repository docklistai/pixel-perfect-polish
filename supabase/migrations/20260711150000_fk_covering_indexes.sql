-- Restore the phase-4 invariant: every public foreign key has a covering index.
--
-- Phases 13-15 added composite foreign keys without covering indexes, which
-- the phase4_adversarial suite asserts against (FK column set must be the
-- leading columns of some index). Additive only: four indexes, no table or
-- policy changes.

create index rota_demand_templates_workspace_created_by_idx
  on public.rota_demand_templates (workspace_id, created_by_membership_id);

create index rota_demand_template_slots_workspace_department_idx
  on public.rota_demand_template_slots (workspace_id, department_id);

create index staff_pay_rates_workspace_set_by_idx
  on public.staff_pay_rates (workspace_id, set_by_membership_id);

create index staff_recurring_day_off_workspace_decided_by_idx
  on public.staff_recurring_day_off_requests (workspace_id, decided_by_membership_id);
