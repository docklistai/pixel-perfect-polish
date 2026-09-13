begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000651', 'authenticated', 'authenticated', 'p65.manager@example.com'),
  ('00000000-0000-0000-0000-000000000000', 'ad000000-0000-4000-8000-000000000652', 'authenticated', 'authenticated', 'p65.outsider@example.com');

insert into public.workspaces (id, slug, name, timezone, rota_start_weekday)
values ('41000000-0000-4000-8000-000000000651', 'p65-site', 'P65 Site', 'Europe/London', 0);
insert into public.locations (id, workspace_id, name, timezone)
values ('42000000-0000-4000-8000-000000000651', '41000000-0000-4000-8000-000000000651', 'P65 Site', 'Europe/London');
insert into public.departments (id, workspace_id, name)
values ('43000000-0000-4000-8000-000000000651', '41000000-0000-4000-8000-000000000651', 'Kitchen');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at)
values ('44000000-0000-4000-8000-000000000651', '41000000-0000-4000-8000-000000000651', 'ad000000-0000-4000-8000-000000000651', 'owner', 'active', '2026-06-01T08:00:00Z', '2026-06-01T09:00:00Z');

insert into public.staff_members (id, workspace_id, display_name, role_name, department_id, employment_status, contracted_minutes_per_week)
values ('46000000-0000-4000-8000-00000000065a', '41000000-0000-4000-8000-000000000651', 'Ana Chef', 'Chef', '43000000-0000-4000-8000-000000000651', 'active', 2400);

-- An existing week to prove refusal on already-exists
insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
values ('45000000-0000-4000-8000-000000000651', '41000000-0000-4000-8000-000000000651', '42000000-0000-4000-8000-000000000651', '2026-07-27', 'draft');

select set_config('request.jwt.claims', '{"sub":"ad000000-0000-4000-8000-000000000651","role":"authenticated"}', true);
set local role authenticated;

create or replace function pg_temp.p65_signature(p_date text, p_start text, p_end text, p_overnight boolean)
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'workDate', p_date, 'startLocal', p_start, 'endLocal', p_end,
    'overnight', p_overnight, 'roleKey', 'chef',
    'departmentId', '43000000-0000-4000-8000-000000000651',
    'locationId', '42000000-0000-4000-8000-000000000651',
    'breakMinutes', 30);
$$;

create or replace function pg_temp.p65_source()
returns jsonb language sql immutable as $$
  select jsonb_build_object('kind', 'template', 'id', 'tpl-1', 'contentVersion', 1, 'plannerRuleVersion', 'build-week/1');
$$;

create or replace function pg_temp.p65_operations()
returns jsonb language sql stable as $$
  select jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p65_signature('2026-08-03', '09:00', '17:00', false),
      'reason', 'Built from template'),
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef',
      'signature', pg_temp.p65_signature('2026-08-04', '12:00', '20:00', false),
      'reason', 'Built from template')
  );
$$;

create or replace function pg_temp.p65_stamp()
returns jsonb language sql volatile as $$
  select public.rpc_build_week_fresh_proposal_stamp(
    '41000000-0000-4000-8000-000000000651',
    '42000000-0000-4000-8000-000000000651',
    '2026-08-03',
    pg_temp.p65_source(),
    pg_temp.p65_operations());
$$;

create or replace function pg_temp.p65_apply(p_fingerprint text, p_digest text, p_operations jsonb)
returns jsonb language sql volatile as $$
  select public.rpc_apply_build_to_new_week(
    '41000000-0000-4000-8000-000000000651',
    '42000000-0000-4000-8000-000000000651',
    '2026-08-03',
    p_fingerprint, p_digest, pg_temp.p65_source(), p_operations);
$$;

create or replace function pg_temp.p65_fresh_week_count()
returns integer language sql stable as $$
  select count(*)::integer from public.rota_weeks as rw
  where rw.workspace_id = '41000000-0000-4000-8000-000000000651'
    and rw.location_id = '42000000-0000-4000-8000-000000000651'
    and rw.week_start = '2026-08-03';
$$;

create or replace function pg_temp.p65_fresh_shift_count()
returns integer language sql stable as $$
  select count(*)::integer
  from public.shifts as s
  join public.rota_weeks as rw on rw.id = s.rota_week_id
  where rw.workspace_id = '41000000-0000-4000-8000-000000000651'
    and rw.week_start = '2026-08-03';
$$;

-- Case 1: Fresh Build stamp fingerprints absence
do $$
declare
  stamp jsonb;
begin
  if pg_temp.p65_fresh_week_count() <> 0 then
    raise exception 'FAIL case 1: fixture already has a 2026-08-03 week';
  end if;

  stamp := pg_temp.p65_stamp();

  if stamp->>'fingerprint' is null or length(stamp->>'fingerprint') <> 32 then
    raise exception 'FAIL case 1: no fingerprint issued for a fresh week';
  end if;
  if stamp->>'digest' is distinct from md5(pg_temp.p65_operations()::text) then
    raise exception 'FAIL case 1: digest is not taken over the operation list';
  end if;
  if stamp->>'week_state' is distinct from 'absent' then
    raise exception 'FAIL case 1: the stamp does not declare the week state';
  end if;
  if pg_temp.p65_fresh_week_count() <> 0 or pg_temp.p65_fresh_shift_count() <> 0 then
    raise exception 'FAIL case 1: previewing wrote to the database';
  end if;
end
$$;

-- Case 2: Stamp refuses when week already exists
do $$
declare
  refused boolean := false;
begin
  begin
    perform public.rpc_build_week_fresh_proposal_stamp(
      '41000000-0000-4000-8000-000000000651',
      '42000000-0000-4000-8000-000000000651',
      '2026-07-27',
      pg_temp.p65_source(), pg_temp.p65_operations());
  exception when sqlstate '55000' then refused := true;
  end;
  if not refused then
    raise exception 'FAIL case 2: stamped a fresh-week proposal against a live week';
  end if;
end
$$;

-- Case 3: Fresh Build apply creates exactly one draft week + operations
do $$
declare
  stamp jsonb;
  applied jsonb;
  new_week_id uuid;
begin
  stamp := pg_temp.p65_stamp();
  applied := pg_temp.p65_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p65_operations());

  if (applied->>'week_created')::boolean is not true then
    raise exception 'FAIL case 3: apply did not report creating the week';
  end if;
  if (applied->>'created_open')::integer <> 2 or (applied->>'created_assigned')::integer <> 0 then
    raise exception 'FAIL case 3: wrong shifts created: %', applied;
  end if;
  if pg_temp.p65_fresh_week_count() <> 1 then
    raise exception 'FAIL case 3: expected exactly one new week';
  end if;
  if pg_temp.p65_fresh_shift_count() <> 2 then
    raise exception 'FAIL case 3: expected 2 shifts';
  end if;

  new_week_id := (applied->>'rota_week_id')::uuid;

  if not exists (
    select 1 from public.audit_events as e
    where e.subject_id = new_week_id
      and e.action = 'rota_week.created_for_build'
      and e.details->>'input_fingerprint' = stamp->>'fingerprint'
      and e.details->>'proposal_digest' = stamp->>'digest'
  ) then
    raise exception 'FAIL case 3: audit event created_for_build missing';
  end if;

  if exists (
    select 1 from public.audit_events as e
    where e.subject_id = new_week_id and e.action = 'rota_week.created_for_import'
  ) then
    raise exception 'FAIL case 3: audit event created_for_import was written, but should be build';
  end if;

  if not exists (
    select 1 from public.audit_events as e
    where e.subject_id = new_week_id and e.action = 'rota_week.built'
  ) then
    raise exception 'FAIL case 3: delegated apply did not write rota_week.built';
  end if;

  -- Replay refuses
  declare
    replayed boolean := false;
  begin
    begin
      perform pg_temp.p65_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p65_operations());
    exception when sqlstate '55000' then replayed := true;
    end;
    if not replayed then
      raise exception 'FAIL case 3: replay applied twice';
    end if;
  end;
end
$$;

delete from public.shifts
where workspace_id = '41000000-0000-4000-8000-000000000651'
  and rota_week_id in (select id from public.rota_weeks where week_start = '2026-08-03');
delete from public.rota_weeks where workspace_id = '41000000-0000-4000-8000-000000000651' and week_start = '2026-08-03';

-- Case 4: Stale refusal if a week appears after preview
do $$
declare
  stamp jsonb;
  refused boolean := false;
begin
  stamp := pg_temp.p65_stamp();
  insert into public.rota_weeks (id, workspace_id, location_id, week_start, status)
  values ('45000000-0000-4000-8000-000000000652', '41000000-0000-4000-8000-000000000651', '42000000-0000-4000-8000-000000000651', '2026-08-03', 'draft');

  begin
    perform pg_temp.p65_apply(stamp->>'fingerprint', stamp->>'digest', pg_temp.p65_operations());
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 4: stale fresh-week build applied into live week';
  end if;
end
$$;

delete from public.rota_weeks where workspace_id = '41000000-0000-4000-8000-000000000651' and week_start = '2026-08-03';

-- Case 5: Atomic failure leaves no week/shifts
do $$
declare
  stamp jsonb;
  mixed jsonb;
  refused boolean := false;
begin
  stamp := pg_temp.p65_stamp();
  mixed := jsonb_build_array(
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef', 'reason', 'good row',
      'signature', pg_temp.p65_signature('2026-08-03', '09:00', '17:00', false)),
    jsonb_build_object('kind', 'create-open', 'roleName', 'Chef', 'reason', 'out of week',
      'signature', pg_temp.p65_signature('2026-08-20', '09:00', '17:00', false)));

  begin
    perform pg_temp.p65_apply(stamp->>'fingerprint', md5(mixed::text), mixed);
  exception when sqlstate '55000' then refused := true;
  end;

  if not refused then
    raise exception 'FAIL case 5: applied bad operations';
  end if;
  if pg_temp.p65_fresh_week_count() <> 0 then
    raise exception 'FAIL case 5: failed apply left week behind';
  end if;
  if pg_temp.p65_fresh_shift_count() <> 0 then
    raise exception 'FAIL case 5: failed apply left shifts behind';
  end if;
end
$$;

-- Case 6: Grants
do $$
begin
  if not has_function_privilege('authenticated',
       'public.rpc_build_week_fresh_proposal_stamp(uuid, uuid, date, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 6: managers cannot reach fresh stamp';
  end if;
  if not has_function_privilege('authenticated',
       'public.rpc_apply_build_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 6: managers cannot reach fresh apply';
  end if;

  if has_function_privilege('anon',
       'public.rpc_build_week_fresh_proposal_stamp(uuid, uuid, date, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 6: anon can reach fresh stamp';
  end if;
  if has_function_privilege('anon',
       'public.rpc_apply_build_to_new_week(uuid, uuid, date, text, text, jsonb, jsonb)', 'execute') then
    raise exception 'FAIL case 6: anon can reach fresh apply';
  end if;

  if has_function_privilege('authenticated', 'public.rpc_internal_import_absent_week_fingerprint(uuid, uuid, date, jsonb)', 'execute') then
    raise exception 'FAIL case 6: authenticated can reach internal absent week fingerprint helper';
  end if;
  if has_function_privilege('authenticated', 'public.rpc_internal_build_week_digest(jsonb)', 'execute') then
    raise exception 'FAIL case 6: authenticated can reach internal build week digest helper';
  end if;

  if has_function_privilege('anon', 'public.rpc_internal_import_absent_week_fingerprint(uuid, uuid, date, jsonb)', 'execute') then
    raise exception 'FAIL case 6: anon can reach internal absent week fingerprint helper';
  end if;
  if has_function_privilege('anon', 'public.rpc_internal_build_week_digest(jsonb)', 'execute') then
    raise exception 'FAIL case 6: anon can reach internal build week digest helper';
  end if;
end
$$;

rollback;
