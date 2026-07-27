-- Phase 46: the approved-hours export audit records a download, not a glance.
--
-- Confirmed defect this corrects: the export dialog ran the audited
-- `rpc_export_approved_hours` as its *preview* query the moment the dialog
-- opened. The Download button only built a client-side blob. Opening the
-- dialog and cancelling, a window refocus, or any preview refetch therefore
-- wrote a permanent `time_entries.exported` audit event for an export that was
-- never downloaded. Audit history claimed exports that did not happen, which is
-- the one thing an audit trail may never do.
--
-- Correction, in three parts:
--
--   1. One shared internal row builder. `rpc_internal_approved_hours_rows`
--      becomes the single implementation of validation and row construction.
--      Preview, download and both pre-existing overloads now call it, so the
--      previewed data and the downloaded data cannot drift apart — there is
--      only one query left to drift.
--
--   2. A preview RPC that writes no audit. `rpc_preview_approved_hours` is
--      manager-authorised and returns the same rows plus a deterministic
--      signature of exactly what it returned.
--
--   3. A download RPC gated on that signature. The new five-argument
--      `rpc_export_approved_hours` overload recomputes the signature
--      server-side and compares it to the one the manager actually reviewed.
--      On mismatch it raises 55000 and writes no audit and returns no rows, so
--      the client must refresh the preview and ask for confirmation again. A
--      manager can therefore never download, or be recorded as downloading,
--      data they did not see.
--
-- Snapshot discipline: every caller captures the export result exactly once,
-- into a single canonical JSONB array, with one statement. The signature, the
-- audited staff/entry counts and the returned rows are all derived from that one
-- capture. Calling the builder repeatedly would have taken a fresh READ
-- COMMITTED snapshot per statement, so a commit landing between them could make
-- the audited signature and counts describe rows other than the ones actually
-- downloaded — the precise dishonesty this phase exists to remove.
--
-- Double-click protection is defence in depth: the client disables Download
-- while a request is in flight, and this function additionally suppresses a
-- second audit for an identical signature within a ten-second window. Two
-- clicks of one button are one export, and the audit trail says so. The window
-- is intentionally narrow and scoped to one actor and one exact signature: two
-- deliberate exports of unchanged data more than ten seconds apart are still
-- recorded separately, and any export of *different* data is always recorded.
--
-- The pre-existing three- and four-argument overloads keep their exact
-- signature, return type, grants and audit-on-call behaviour. They are
-- re-pointed at the shared builder only.
--
-- No table, column, index, policy or RLS-model change.

-- ---------------------------------------------------------------------------
-- 1. Shared row builder — validation and rows, no authority check, no audit.
--    Internal only: every caller below performs the manager check first.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_internal_approved_hours_rows(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_start_date is null or p_end_date is null or p_end_date < p_start_date then
    raise exception 'a valid start and end date is required' using errcode = '22023';
  end if;

  if p_end_date - p_start_date > 366 then
    raise exception 'export range cannot exceed one year' using errcode = '22023';
  end if;

  if p_department_id is not null and not exists (
    select 1
    from public.departments as department
    where department.workspace_id = p_workspace_id
      and department.id = p_department_id
  ) then
    raise exception 'department not found in this workspace' using errcode = 'P0002';
  end if;

  return query
  select
    staff.id,
    public.rpc_internal_csv_safe(staff.display_name),
    -- Worked shift is the authority; the profile is only a fallback for
    -- entries that were never linked to a shift (gate 3 behaviour, unchanged).
    public.rpc_internal_csv_safe(coalesce(worked.role_name, staff.role_name)),
    public.rpc_internal_csv_safe(coalesce(worked_department.name, profile_department.name)),
    count(entry.id),
    coalesce(pg_catalog.sum(
      greatest(
        0::bigint,
        pg_catalog.floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
          - entry.break_minutes
      )
    ), 0)::bigint,
    pg_catalog.round(
      coalesce(pg_catalog.sum(
        greatest(
          0::bigint,
          pg_catalog.floor(extract(epoch from (entry.clocked_out_at - entry.clocked_in_at)) / 60)::bigint
            - entry.break_minutes
        )
      ), 0) / 60.0,
      2
    )
  from public.time_entries as entry
  join public.staff_members as staff
    on staff.workspace_id = entry.workspace_id
   and staff.id = entry.staff_member_id
  left join public.shifts as worked
    on worked.workspace_id = entry.workspace_id
   and worked.id = entry.shift_id
  left join public.departments as worked_department
    on worked_department.workspace_id = entry.workspace_id
   and worked_department.id = worked.department_id
  left join public.departments as profile_department
    on profile_department.workspace_id = staff.workspace_id
   and profile_department.id = staff.department_id
  where entry.workspace_id = p_workspace_id
    and entry.approval_status = 'approved'
    and entry.work_date between p_start_date and p_end_date
    and entry.clocked_in_at is not null
    and entry.clocked_out_at is not null
    and (
      p_department_id is null
      or coalesce(worked.department_id, staff.department_id) = p_department_id
    )
  group by
    staff.id,
    staff.display_name,
    coalesce(worked.role_name, staff.role_name),
    coalesce(worked_department.name, profile_department.name)
  order by
    staff.display_name,
    staff.id,
    coalesce(worked_department.name, profile_department.name),
    coalesce(worked.role_name, staff.role_name);
end;
$$;

revoke all on function public.rpc_internal_approved_hours_rows(uuid, date, date, uuid)
  from public, anon, authenticated;

comment on function public.rpc_internal_approved_hours_rows(uuid, date, date, uuid) is
  'Internal. Single shared implementation of approved-hours validation and row construction. Callers must perform their own manager authority check first. Writes no audit.';

-- ---------------------------------------------------------------------------
-- 2a. Single-statement capture of the export result.
--
--     One statement means one READ COMMITTED snapshot, so everything derived
--     from the returned array — signature, counts, audit metadata, CSV rows —
--     describes the same instant. Ordering is fixed here and carried by the
--     array, so callers never re-sort and can never disagree about row order.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_internal_approved_hours_capture(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    pg_catalog.jsonb_agg(
      -- A JSON array, not a delimited string: field boundaries are structural,
      -- so no byte inside a value can be mistaken for a separator. Positional
      -- (not keyed) so the encoding cannot be reordered.
      pg_catalog.jsonb_build_array(
        scoped.staff_member_id,
        scoped.display_name,
        scoped.role_name,
        scoped.department_name,
        scoped.entry_count,
        scoped.approved_minutes,
        scoped.approved_hours
      )
      order by
        scoped.display_name,
        scoped.staff_member_id,
        scoped.department_name,
        scoped.role_name
    ),
    '[]'::jsonb
  )
  from public.rpc_internal_approved_hours_rows(
    p_workspace_id, p_start_date, p_end_date, p_department_id
  ) as scoped;
$$;

revoke all on function public.rpc_internal_approved_hours_capture(uuid, date, date, uuid)
  from public, anon, authenticated;

comment on function public.rpc_internal_approved_hours_capture(uuid, date, date, uuid) is
  'Internal. Captures the approved-hours export result exactly once, as a canonically ordered JSONB array of positional row arrays. One statement, one snapshot: signature, counts and returned rows are all derived from this single value.';

-- ---------------------------------------------------------------------------
-- 2b. Deterministic signature over a captured result.
--
--     A delimiter-based encoding — fields joined with chr(31), rows with
--     chr(30) — was drafted and rejected while this phase was being developed.
--     It was justified by a claim that rpc_internal_csv_safe removes control
--     characters. It does not: it flattens CR/LF and prefixes formula leaders,
--     and nothing else. A display name or role containing chr(31) could
--     therefore shift a field boundary and make two genuinely different result
--     sets hash identically, destroying the exact guarantee this signature
--     exists to provide. That draft was never committed and never released; no
--     earlier DocklistAI migration introduced this function, and the design
--     below is the only one this phase ships.
--
--     Canonical JSONB removes the class of bug rather than patching it: values
--     are escaped, boundaries are structural, JSON null is distinct from the
--     empty string, and numbers are distinct from their text form. The
--     signature also takes the capture as an argument instead of re-querying,
--     so it always describes the rows the caller actually holds.
-- ---------------------------------------------------------------------------
-- Defensive only. On a released database this is a no-op, because no shipped
-- migration ever created this function. It exists so that a local development
-- database still carrying the rejected four-argument draft cannot keep a
-- collidable encoding reachable after this migration is applied.
drop function if exists public.rpc_internal_approved_hours_signature(uuid, date, date, uuid);

create or replace function public.rpc_internal_approved_hours_signature(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid,
  p_captured_rows jsonb
) returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.md5(
    pg_catalog.jsonb_build_object(
      'workspace_id', p_workspace_id,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'department_id', p_department_id,
      'rows', coalesce(p_captured_rows, '[]'::jsonb)
    )::text
  );
$$;

revoke all on function public.rpc_internal_approved_hours_signature(uuid, date, date, uuid, jsonb)
  from public, anon, authenticated;

comment on function public.rpc_internal_approved_hours_signature(uuid, date, date, uuid, jsonb) is
  'Internal. Deterministic md5 over the export scope and a captured result. Encoded as canonical JSONB so control characters in staff/role/department names cannot forge a field boundary and collide two different result sets. Pure: it hashes what it is given, never a fresh query.';

-- ---------------------------------------------------------------------------
-- 2c. Expand a capture back into the export's typed row shape, preserving the
--     capture's own order via WITH ORDINALITY.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_internal_approved_hours_expand(
  p_captured_rows jsonb
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language sql
immutable
set search_path = ''
as $$
  select
    (captured.row_value ->> 0)::uuid,
    captured.row_value ->> 1,
    captured.row_value ->> 2,
    captured.row_value ->> 3,
    (captured.row_value ->> 4)::bigint,
    (captured.row_value ->> 5)::bigint,
    (captured.row_value ->> 6)::numeric
  from pg_catalog.jsonb_array_elements(coalesce(p_captured_rows, '[]'::jsonb))
    with ordinality as captured(row_value, position)
  order by captured.position;
$$;

revoke all on function public.rpc_internal_approved_hours_expand(jsonb)
  from public, anon, authenticated;

comment on function public.rpc_internal_approved_hours_expand(jsonb) is
  'Internal. Expands a captured approved-hours result back into the export row shape, preserving the capture order. JSON null stays SQL NULL, so a missing department is never confused with an empty name.';

-- ---------------------------------------------------------------------------
-- 3. Preview — manager-authorised, no audit write.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_preview_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric,
  preview_signature text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  captured_rows jsonb;
  scope_signature text;
begin
  perform public.rpc_internal_require_manager(p_workspace_id);

  -- One capture, one snapshot: the signature necessarily describes the exact
  -- rows returned below, not a second read of the same query.
  captured_rows := public.rpc_internal_approved_hours_capture(
    p_workspace_id, p_start_date, p_end_date, p_department_id);

  scope_signature := public.rpc_internal_approved_hours_signature(
    p_workspace_id, p_start_date, p_end_date, p_department_id, captured_rows);

  return query
  select scoped.staff_member_id,
         scoped.display_name,
         scoped.role_name,
         scoped.department_name,
         scoped.entry_count,
         scoped.approved_minutes,
         scoped.approved_hours,
         scope_signature
  from public.rpc_internal_approved_hours_expand(captured_rows) as scoped;
end;
$$;

revoke all on function public.rpc_preview_approved_hours(uuid, date, date, uuid)
  from public, anon;
grant execute on function public.rpc_preview_approved_hours(uuid, date, date, uuid)
  to authenticated;

comment on function public.rpc_preview_approved_hours(uuid, date, date, uuid) is
  'Manager/owner only. Approved-hours preview. Identical authority, filters, worked-shift role/department authority and CSV safety as the export, but writes NO audit event — opening, refetching or cancelling a preview is not an export. Returns a preview_signature the download must present back.';

-- ---------------------------------------------------------------------------
-- 4. Download — signature-gated, exactly one audit event.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_export_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid,
  p_expected_signature text
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  captured_rows jsonb;
  current_signature text;
  exported_staff_count integer;
  exported_entry_count integer;
  already_audited boolean;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  if coalesce(pg_catalog.btrim(p_expected_signature), '') = '' then
    raise exception 'a reviewed preview signature is required to export'
      using errcode = '22023';
  end if;

  -- The one and only read of the export data in this function. Everything
  -- below — the signature that gates the download, the counts written to the
  -- audit event, and the rows returned to the manager — is derived from this
  -- single captured value, so the audit can never describe rows other than the
  -- ones actually downloaded.
  captured_rows := public.rpc_internal_approved_hours_capture(
    p_workspace_id, p_start_date, p_end_date, p_department_id);

  current_signature := public.rpc_internal_approved_hours_signature(
    p_workspace_id, p_start_date, p_end_date, p_department_id, captured_rows);

  -- The reviewed data has changed since the preview was taken. Write nothing,
  -- return nothing: the client refreshes the preview and asks the manager to
  -- confirm again. An audit event here would claim an export of data nobody
  -- reviewed.
  --
  -- 55000 (object_not_in_prerequisite_state) is the same business-refusal code
  -- the publish and copy/clear-day guards use. It must NOT be 40001: PostgREST
  -- treats serialization_failure as transient and retries it, so a refusal that
  -- is deterministic by design would be retried until the gateway times out —
  -- the manager would wait a minute and then see a generic error instead of
  -- being told to review the refreshed figures.
  if current_signature is distinct from p_expected_signature then
    raise exception 'the approved hours changed since this preview was taken'
      using errcode = '55000';
  end if;

  -- Double-click protection. A second identical request inside ten seconds is
  -- the same export, not a new one, so it returns the same rows without
  -- recording a misleading duplicate.
  select exists (
    select 1
    from public.audit_events as event
    where event.workspace_id = p_workspace_id
      and event.action = 'time_entries.exported'
      and event.actor_membership_id = caller_membership_id
      and event.details ->> 'signature' = current_signature
      and event.occurred_at > pg_catalog.now() - interval '10 seconds'
  ) into already_audited;

  if not already_audited then
    select count(distinct scoped.staff_member_id), pg_catalog.sum(scoped.entry_count)
    into exported_staff_count, exported_entry_count
    from public.rpc_internal_approved_hours_expand(captured_rows) as scoped;

    perform public.rpc_internal_write_audit(
      p_workspace_id,
      caller_membership_id,
      'time_entries.exported',
      'workspace',
      p_workspace_id,
      pg_catalog.jsonb_build_object(
        'start_date', p_start_date,
        'end_date', p_end_date,
        'scope', case when p_department_id is null then 'workspace' else 'department' end,
        'department_id', p_department_id,
        'staff_count', coalesce(exported_staff_count, 0),
        'entry_count', coalesce(exported_entry_count, 0),
        'signature', current_signature,
        'confirmed_download', true
      )
    );
  end if;

  return query
  select scoped.staff_member_id,
         scoped.display_name,
         scoped.role_name,
         scoped.department_name,
         scoped.entry_count,
         scoped.approved_minutes,
         scoped.approved_hours
  from public.rpc_internal_approved_hours_expand(captured_rows) as scoped;
end;
$$;

revoke all on function public.rpc_export_approved_hours(uuid, date, date, uuid, text)
  from public, anon;
grant execute on function public.rpc_export_approved_hours(uuid, date, date, uuid, text)
  to authenticated;

comment on function public.rpc_export_approved_hours(uuid, date, date, uuid, text) is
  'Manager/owner only. Audited approved-hours download. Requires the signature of the preview the manager reviewed; a mismatch raises 55000 and writes no audit and returns no rows. Writes exactly one time_entries.exported event per confirmed download, suppressing an identical repeat within ten seconds so a double-click cannot forge duplicate audit history.';

-- ---------------------------------------------------------------------------
-- 5. Pre-existing overloads re-pointed at the shared builder. Signature,
--    return type, grants and audit-on-call behaviour are unchanged; these
--    remain valid direct-export entry points for non-dialog callers.
-- ---------------------------------------------------------------------------
create or replace function public.rpc_export_approved_hours(
  p_workspace_id uuid,
  p_start_date date,
  p_end_date date,
  p_department_id uuid
) returns table (
  staff_member_id uuid,
  display_name text,
  role_name text,
  department_name text,
  entry_count bigint,
  approved_minutes bigint,
  approved_hours numeric
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_membership_id uuid;
  captured_rows jsonb;
  exported_staff_count integer;
  exported_entry_count integer;
begin
  caller_membership_id := public.rpc_internal_require_manager(p_workspace_id);

  -- Same snapshot discipline as the signature-gated overload: capture once,
  -- then audit and return from that one value.
  captured_rows := public.rpc_internal_approved_hours_capture(
    p_workspace_id, p_start_date, p_end_date, p_department_id);

  select count(distinct scoped.staff_member_id), pg_catalog.sum(scoped.entry_count)
  into exported_staff_count, exported_entry_count
  from public.rpc_internal_approved_hours_expand(captured_rows) as scoped;

  perform public.rpc_internal_write_audit(
    p_workspace_id,
    caller_membership_id,
    'time_entries.exported',
    'workspace',
    p_workspace_id,
    pg_catalog.jsonb_build_object(
      'start_date', p_start_date,
      'end_date', p_end_date,
      'scope', case when p_department_id is null then 'workspace' else 'department' end,
      'department_id', p_department_id,
      'staff_count', coalesce(exported_staff_count, 0),
      'entry_count', coalesce(exported_entry_count, 0)
    )
  );

  return query
  select scoped.staff_member_id,
         scoped.display_name,
         scoped.role_name,
         scoped.department_name,
         scoped.entry_count,
         scoped.approved_minutes,
         scoped.approved_hours
  from public.rpc_internal_approved_hours_expand(captured_rows) as scoped;
end;
$$;

revoke all on function public.rpc_export_approved_hours(uuid, date, date, uuid)
  from public, anon;
grant execute on function public.rpc_export_approved_hours(uuid, date, date, uuid)
  to authenticated;

comment on function public.rpc_export_approved_hours(uuid, date, date, uuid) is
  'Manager/owner only. Direct audited approved-hours export scoped to an optional workspace-owned department. Row construction is delegated to the shared rpc_internal_approved_hours_rows builder. The dialog now uses the preview + signature-gated download pair instead; this overload is retained for direct callers.';
