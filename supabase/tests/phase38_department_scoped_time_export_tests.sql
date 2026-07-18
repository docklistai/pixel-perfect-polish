-- Phase 38 server-authoritative department export checks.
begin;

insert into auth.users (instance_id, id, aud, role, email, is_anonymous, created_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'e3000000-0000-4000-8000-000000000001',
  'authenticated', 'authenticated', null, true, now()
);

-- Bind a staff-only adversarial caller.
update public.workspace_memberships
set user_id = 'e3000000-0000-4000-8000-000000000001',
    status = 'active',
    joined_at = now()
where id = '13000000-0000-4000-8000-000000000006';

-- A department in another workspace is a valid UUID but never a valid scope.
insert into public.workspaces (id, slug, name, timezone)
values ('e3100000-0000-4000-8000-000000000001', 'phase38-other', 'Phase38 Other', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values (
  'e3200000-0000-4000-8000-000000000001',
  'e3100000-0000-4000-8000-000000000001',
  'Other tenant department'
);

-- Isolated date range: two FOH approved entries (690 minutes), one Kitchen
-- approved entry (420 minutes), and one pending entry that must never export.
insert into public.time_entries (
  id, workspace_id, staff_member_id, work_date,
  clocked_in_at, clocked_out_at, break_minutes,
  approval_status, approved_at, approved_by_membership_id
) values
  ('e3300000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2099-02-01', '2099-02-01T09:00:00Z', '2099-02-01T17:00:00Z', 30, 'approved', now(), '13000000-0000-4000-8000-000000000011'),
  ('e3300000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2099-02-02', '2099-02-02T09:00:00Z', '2099-02-02T13:00:00Z', 0, 'approved', now(), '13000000-0000-4000-8000-000000000011'),
  ('e3300000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000002', '2099-02-01', '2099-02-01T10:00:00Z', '2099-02-01T18:00:00Z', 60, 'approved', now(), '13000000-0000-4000-8000-000000000011'),
  ('e3300000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', '14000000-0000-4000-8000-000000000001', '2099-02-03', '2099-02-03T09:00:00Z', '2099-02-03T12:00:00Z', 0, 'pending', null, null);

-- Exercise CSV-injection safety through the actual export path.
update public.staff_members
set display_name = '=Sophie Export Probe'
where id = '14000000-0000-4000-8000-000000000001';

select set_config(
  'request.jwt.claims',
  '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
declare
  exported_rows integer;
  total_entries bigint;
  total_minutes bigint;
  total_hours numeric;
  exported_name text;
begin
  select count(*), sum(export.entry_count), sum(export.approved_minutes),
         sum(export.approved_hours), min(export.display_name)
  into exported_rows, total_entries, total_minutes, total_hours, exported_name
  from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001',
    '2099-02-01', '2099-02-28',
    '12000000-0000-4000-8000-000000000001'
  ) as export;

  if exported_rows <> 1 or total_entries <> 2 or total_minutes <> 690
     or total_hours <> 11.50 then
    raise exception 'FAIL: FOH export rows %, entries %, minutes %, hours %',
      exported_rows, total_entries, total_minutes, total_hours;
  end if;

  if exported_name <> '''=Sophie Export Probe' then
    raise exception 'FAIL: CSV injection prefix was not neutralised: %', exported_name;
  end if;

  raise notice 'PASS: department scope returns matching approved rows, hours and CSV-safe text';
end $$;

do $$
declare exported_rows integer; total_entries bigint; total_minutes bigint;
begin
  select count(*), sum(export.entry_count), sum(export.approved_minutes)
  into exported_rows, total_entries, total_minutes
  from public.rpc_export_approved_hours(
    '10000000-0000-4000-8000-000000000001',
    '2099-02-01', '2099-02-28'
  ) as export;

  if exported_rows <> 2 or total_entries <> 3 or total_minutes <> 1110 then
    raise exception 'FAIL: whole-workspace export rows %, entries %, minutes %',
      exported_rows, total_entries, total_minutes;
  end if;

  raise notice 'PASS: legacy whole-workspace contract delegates to authoritative scope';
end $$;

do $$
begin
  begin
    perform 1
    from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001',
      '2099-02-01', '2099-02-28',
      'e3200000-0000-4000-8000-000000000001'
    );
    raise exception 'FAIL: cross-workspace department was accepted';
  exception when sqlstate 'P0002' then
    raise notice 'PASS: cross-workspace department scope is rejected';
  end;
end $$;

-- A staff caller cannot export even their own department.
select set_config(
  'request.jwt.claims',
  '{"sub":"e3000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);

do $$
begin
  begin
    perform 1
    from public.rpc_export_approved_hours(
      '10000000-0000-4000-8000-000000000001',
      '2099-02-01', '2099-02-28',
      '12000000-0000-4000-8000-000000000001'
    );
    raise exception 'FAIL: staff exported approved hours';
  exception when sqlstate '42501' then
    raise notice 'PASS: approved-hours exports remain manager-only';
  end;
end $$;

reset role;

do $$
declare department_audits integer; workspace_audits integer;
begin
  select count(*) into department_audits
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported'
    and details ->> 'scope' = 'department'
    and details ->> 'department_id' = '12000000-0000-4000-8000-000000000001'
    and (details ->> 'staff_count')::integer = 1
    and (details ->> 'entry_count')::integer = 2;

  select count(*) into workspace_audits
  from public.audit_events
  where workspace_id = '10000000-0000-4000-8000-000000000001'
    and action = 'time_entries.exported'
    and details ->> 'scope' = 'workspace'
    and details -> 'department_id' = 'null'::jsonb
    and (details ->> 'staff_count')::integer = 2
    and (details ->> 'entry_count')::integer = 3;

  if department_audits <> 1 or workspace_audits <> 1 then
    raise exception 'FAIL: export scope audit evidence department %, workspace %',
      department_audits, workspace_audits;
  end if;

  raise notice 'PASS: exact server export scope and counts are audited';
end $$;

rollback;
