-- Phase 74 — Prohibit direct staff writes to Hours Queries (R7).
--
-- Staff must raise Hours Queries only through the approved RPC:
-- public.rpc_staff_raise_hours_query(workspace_id, time_entry_id, issue_type, note).
-- Direct INSERT and UPDATE by staff on public.time_hours_queries must be impossible.
--
-- Implementation:
-- 1. Drop the direct staff insert policy time_hours_queries_staff_insert.
-- 2. Revoke insert on public.time_hours_queries from authenticated.
-- 3. Only managers retain update via time_hours_queries_manager_update.
-- 4. Staff queries continue to be raised via rpc_staff_raise_hours_query (security definer).

drop policy if exists time_hours_queries_staff_insert on public.time_hours_queries;

revoke insert on table public.time_hours_queries from authenticated;

notify pgrst, 'reload schema';
