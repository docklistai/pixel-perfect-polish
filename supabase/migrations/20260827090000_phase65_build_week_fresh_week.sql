-- Phase 65: Build the Week into a fresh week.
--
-- Adds front doors to preview and apply a build directly into a genuinely
-- fresh week (no existing rota_weeks row). These wrappers mirror the import
-- fresh-week wrappers from phase 51 but are distinct for three reasons:
-- 1. Build has its own refusal wording.
-- 2. Build writes a distinct audit event ('rota_week.created_for_build').
-- 3. Build does not gain the import-specific 16-hour shift-length preflight
--    (it is still subject to the global table invariant).
--
-- Both new functions delegate to existing internal helpers, preserving the exact
-- fingerprinting and apply rules used by both existing-week Build and Import.

-- ---------------------------------------------------------------------------
-- 1. Manager-guarded stamp for a fresh week build
-- ---------------------------------------------------------------------------

create or replace function public.rpc_build_week_fresh_proposal_stamp(
  p_workspace_id uuid,
  p_location_id uuid,
  p_week_start date,
  p_source jsonb,
  p_operations jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  fingerprint text;
  start_weekday smallint;
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  if p_week_start is null then
    raise exception 'A week start date is required.' using errcode = '22023';
  end if;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;
  if (extract(isodow from p_week_start)::integer - 1) is distinct from coalesce(start_weekday, 0) then
    raise exception 'That date is not the first day of one of your rota weeks.'
      using errcode = '55000';
  end if;

  fingerprint := public.rpc_internal_import_absent_week_fingerprint(
    p_workspace_id, p_location_id, p_week_start, p_source);

  if fingerprint is null then
    raise exception 'This week already exists, or its location is unavailable. Reopen the week and build again.'
      using errcode = '55000';
  end if;

  return jsonb_build_object(
    'fingerprint', fingerprint,
    'digest', public.rpc_internal_build_week_digest(p_operations),
    'week_state', 'absent'
  );
end;
$$;

revoke all on function public.rpc_build_week_fresh_proposal_stamp(uuid, uuid, date, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_build_week_fresh_proposal_stamp(uuid, uuid, date, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_build_week_fresh_proposal_stamp(uuid, uuid, date, jsonb, jsonb) is
  'Manager-only: issues the fingerprint and digest for a schedule build into a week that does not exist yet. Refuses when the week already exists.';

-- ---------------------------------------------------------------------------
-- 2. Apply build to a fresh week
-- ---------------------------------------------------------------------------

create or replace function public.rpc_apply_build_to_new_week(
  p_workspace_id uuid,
  p_location_id uuid,
  p_week_start date,
  p_input_fingerprint text,
  p_proposal_digest text,
  p_source jsonb,
  p_operations jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  current_fingerprint text;
  new_week_id uuid;
  start_weekday smallint;
  applied jsonb;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if p_week_start is null or p_location_id is null then
    raise exception 'This build is missing the week it belongs to. Reopen the week and build again.'
      using errcode = '22023';
  end if;

  if p_operations is null or jsonb_typeof(p_operations) <> 'array' then
    raise exception 'The build could not be read. Preview it again.' using errcode = '22023';
  end if;

  select w.rota_start_weekday into start_weekday
  from public.workspaces as w where w.id = p_workspace_id;
  if (extract(isodow from p_week_start)::integer - 1) is distinct from coalesce(start_weekday, 0) then
    raise exception 'That date is not the first day of one of your rota weeks.'
      using errcode = '55000';
  end if;

  -- Integrity first: the operation list is the one that was reviewed.
  if public.rpc_internal_build_week_digest(p_operations) is distinct from p_proposal_digest then
    raise exception 'This build was altered before it was applied. Nothing was built. Preview it again.'
      using errcode = '55000';
  end if;

  -- NOTE: Deliberately omitting rpc_internal_assert_import_shift_lengths(p_operations)
  -- here. Build does not gain this import-specific preflight through this door.

  -- Staleness, BEFORE the insert.
  current_fingerprint := public.rpc_internal_import_absent_week_fingerprint(
    p_workspace_id, p_location_id, p_week_start, p_source);

  if current_fingerprint is null then
    raise exception 'That week now exists, so this build is out of date. Nothing was built. Reopen the week and preview again.'
      using errcode = '55000';
  end if;
  if current_fingerprint is distinct from p_input_fingerprint then
    raise exception 'This workspace changed while the build was open. Nothing was built. Preview it again.'
      using errcode = '55000';
  end if;

  -- Create the week. RETURNING is the concurrency gate.
  insert into public.rota_weeks (workspace_id, location_id, week_start, status)
  values (p_workspace_id, p_location_id, p_week_start, 'draft')
  on conflict (workspace_id, location_id, week_start) do nothing
  returning id into new_week_id;

  if new_week_id is null then
    raise exception 'That week was created while this build was open. Nothing was built. Reopen the week and preview again.'
      using errcode = '55000';
  end if;

  -- The first lock in the shift-write hierarchy.
  perform 1
  from public.rota_weeks as rw
  where rw.workspace_id = p_workspace_id and rw.id = new_week_id
  for update;

  applied := public.rpc_apply_build_week_proposal(
    p_workspace_id,
    new_week_id,
    public.rpc_internal_build_week_input_fingerprint(p_workspace_id, new_week_id, p_source),
    p_proposal_digest,
    p_source,
    p_operations
  );

  perform public.rpc_internal_write_audit(
    p_workspace_id, caller_membership_id, 'rota_week.created_for_build', 'rota_week', new_week_id,
    jsonb_build_object(
      'week_start', p_week_start,
      'location_id', p_location_id,
      'source', p_source,
      'operations', jsonb_array_length(p_operations),
      'input_fingerprint', p_input_fingerprint,
      'proposal_digest', p_proposal_digest
    )
  );

  return applied || jsonb_build_object('rota_week_id', new_week_id, 'week_created', true);
end;
$$;

revoke all on function public.rpc_apply_build_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)
  from public, anon;
grant execute on function public.rpc_apply_build_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)
  to authenticated;

comment on function public.rpc_apply_build_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb) is
  'Manager-only, atomic: creates a draft rota week that does not exist yet and applies one reviewed schedule build into it via rpc_apply_build_week_proposal. Refuses a stale or concurrent creation.';

notify pgrst, 'reload schema';
