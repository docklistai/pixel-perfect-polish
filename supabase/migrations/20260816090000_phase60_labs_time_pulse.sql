-- Phase 60: Labs — Time Pulse feature flag.
--
-- One workspace-scoped, typed, default-OFF flag for the Time Pulse experiment.
--
-- Deliberate shape:
--   * A real boolean column, not a jsonb feature bag. Each Labs experiment gets
--     its own typed column so flags stay greppable, constrainable, and
--     independently toggleable. A bag would let an unreviewed key appear at
--     runtime with no schema record of what it means.
--   * `not null default false` enforces default-OFF at the schema level, so a
--     workspace can never be opted in by an omission. Callers must additionally
--     treat an ABSENT workspace_settings row as OFF — the table is created
--     lazily on first save, so "no row" is the common case for a new workspace.
--   * No per-user flag. Labs is a workspace decision made by an owner/manager;
--     a per-member flag would let two managers see different operational truth
--     for the same workspace.
--
-- Additive and manager-only: the column lives on the existing manager-scoped
-- workspace_settings table and inherits its RLS unchanged (owner/manager
-- select/insert/update; staff have no policy and therefore no read path).
-- No new table, policy, grant, RPC, or write authority is introduced.

alter table public.workspace_settings
  add column labs_time_pulse_enabled boolean not null default false;

comment on column public.workspace_settings.labs_time_pulse_enabled is
  'Labs experiment flag: when true, managers see the read-only Time Pulse live attendance surface on Home. Default false. Workspace-scoped, owner/manager-only via existing workspace_settings RLS. Toggling it changes visibility only — it grants no new data access and persists no derived judgement about any staff member.';

notify pgrst, 'reload schema';
