-- Phase 60 Labs flag verification: default OFF at the schema level, absent-row
-- semantics, persistence, and owner/manager-only access with staff denied.
-- Runs inside one rolled-back transaction against the local Supabase stack.
--
-- FIXTURE OWNERSHIP
--
-- Every settings assertion below is made about workspaces this suite creates
-- itself, never about the seeded demo workspace. That matters because
-- `workspace_settings` is a table the application writes to: a manager saving
-- a labour budget, or toggling this very Labs flag once, creates a row for the
-- seeded workspace. A suite that asserted "no settings row exists yet" against
-- that workspace would pass only on a freshly reset database and fail after
-- ordinary use of the product, which is a property of the developer's machine
-- rather than of the code under test.
--
-- Owning the fixture also makes the negative assertions real rather than
-- vacuous. "Staff read zero rows" and "an outside manager reads zero rows"
-- only prove RLS is filtering if a row genuinely exists to be filtered; here
-- one always does, because this suite created it.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'owner.phase60@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'staff.phase60@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'manager.phase60@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a6000000-0000-4000-8000-000000000004',
   'authenticated', 'authenticated', 'outsider.phase60@example.test');

-- The workspace under test, plus an unrelated one for the cross-tenant control.
-- Both are created here and both disappear on rollback.
insert into public.workspaces (id, slug, name, timezone, status)
values
  ('60000000-0000-4000-8000-0000000000a1', 'phase60-primary',
   'Phase 60 Primary Workspace', 'Europe/London', 'active'),
  ('60000000-0000-4000-8000-0000000000b1', 'phase60-other',
   'Phase 60 Other Workspace', 'Europe/London', 'active');

-- Owner, manager and staff in the workspace under test. These inserts run
-- before any JWT claim is set, so `auth.uid()` is null and the membership
-- guard's "only owners may grant the owner role" rule does not apply to the
-- fixture itself.
insert into public.workspace_memberships (
  id, workspace_id, user_id, role, status, invited_at, joined_at
) values
  ('60000000-0000-4000-8000-0000000000a2', '60000000-0000-4000-8000-0000000000a1',
   'a6000000-0000-4000-8000-000000000001', 'owner', 'active',
   '2026-08-01T08:00:00Z', '2026-08-01T09:00:00Z'),
  ('60000000-0000-4000-8000-0000000000a3', '60000000-0000-4000-8000-0000000000a1',
   'a6000000-0000-4000-8000-000000000003', 'manager', 'active',
   '2026-08-01T08:00:00Z', '2026-08-01T09:00:00Z'),
  ('60000000-0000-4000-8000-0000000000a4', '60000000-0000-4000-8000-0000000000a1',
   'a6000000-0000-4000-8000-000000000002', 'staff', 'active',
   '2026-08-01T08:00:00Z', '2026-08-01T09:00:00Z'),
  ('60000000-0000-4000-8000-0000000000b2', '60000000-0000-4000-8000-0000000000b1',
   'a6000000-0000-4000-8000-000000000004', 'manager', 'active',
   '2026-08-01T08:00:00Z', '2026-08-01T09:00:00Z');

-- ---------------------------------------------------------------------------
-- 1. Schema: the flag is a real boolean, not null, default false.
-- ---------------------------------------------------------------------------
do $$
declare
  col record;
begin
  select data_type, is_nullable, column_default
  into col
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'workspace_settings'
    and column_name = 'labs_time_pulse_enabled';

  if col is null then
    raise exception 'FAIL: labs_time_pulse_enabled column is missing';
  end if;
  if col.data_type <> 'boolean' then
    raise exception 'FAIL: labs flag is %, expected boolean (no jsonb bag)', col.data_type;
  end if;
  if col.is_nullable <> 'NO' then
    raise exception 'FAIL: labs flag is nullable; default-OFF must be enforced';
  end if;
  if col.column_default is distinct from 'false' then
    raise exception 'FAIL: labs flag default is %, expected false', col.column_default;
  end if;
end;
$$;

-- No per-user Labs flag may exist anywhere.
do $$
declare
  n integer;
begin
  select count(*) into n
  from information_schema.columns
  where table_schema = 'public'
    and column_name like 'labs\_%'
    and table_name <> 'workspace_settings';
  if n <> 0 then
    raise exception 'FAIL: % Labs column(s) exist outside workspace_settings', n;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Absent row: a workspace that has never saved settings has no row at all,
--    which every caller must read as OFF rather than as an error. Asserted
--    about this suite's own freshly created workspaces, so the claim is true
--    by construction rather than by hoping the database was just reset.
-- ---------------------------------------------------------------------------
do $$
declare
  n integer;
begin
  select count(*) into n from public.workspace_settings
  where workspace_id in ('60000000-0000-4000-8000-0000000000a1',
                         '60000000-0000-4000-8000-0000000000b1');
  if n <> 0 then
    raise exception 'FAIL: a brand new workspace already has % settings row(s)', n;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Owner may create the row; the flag defaults to OFF when unspecified.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a6000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  flag boolean;
begin
  insert into public.workspace_settings (workspace_id)
  values ('60000000-0000-4000-8000-0000000000a1');

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';

  if flag is distinct from false then
    raise exception 'FAIL: a new settings row defaulted to %, expected false', flag;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Persistence: an owner turns it on and the stored value survives.
-- ---------------------------------------------------------------------------
do $$
declare
  flag boolean;
begin
  update public.workspace_settings
  set labs_time_pulse_enabled = true
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';

  if flag is not true then
    raise exception 'FAIL: labs flag did not persist as true, got %', flag;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. A manager in the same workspace may read and change it.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6000000-0000-4000-8000-000000000003","role":"authenticated"}', true);

do $$
declare
  flag boolean;
begin
  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if flag is not true then
    raise exception 'FAIL: manager could not read the labs flag, got %', flag;
  end if;

  update public.workspace_settings
  set labs_time_pulse_enabled = false
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if flag is not false then
    raise exception 'FAIL: manager could not turn the labs flag off, got %', flag;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Staff are denied. A row definitely exists by now, so reading zero rows
--    proves RLS is filtering rather than proving the table happened to be
--    empty. RLS filters rather than raising, so absence of rows and absence of
--    effect are both asserted.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  n integer;
begin
  select count(*) into n from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if n <> 0 then
    raise exception 'FAIL: staff member can read % workspace_settings row(s)', n;
  end if;

  update public.workspace_settings
  set labs_time_pulse_enabled = true
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: staff member updated % workspace_settings row(s)', n;
  end if;

  -- Insert is refused for their own workspace (RLS) and, because the owner
  -- already created that row, the primary key would refuse it too. Either
  -- outcome is a refusal; what must never happen is a successful write.
  begin
    insert into public.workspace_settings (workspace_id, labs_time_pulse_enabled)
    values ('60000000-0000-4000-8000-0000000000a1', true);
    raise exception 'FAIL: staff member inserted a workspace_settings row';
  exception
    when insufficient_privilege then null;
    when unique_violation then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. A manager of another workspace sees nothing and changes nothing — while
--    remaining able to manage their OWN workspace, which proves the refusal
--    above is a tenant boundary and not a broken session.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims',
  '{"sub":"a6000000-0000-4000-8000-000000000004","role":"authenticated"}', true);

do $$
declare
  n integer;
  flag boolean;
begin
  select count(*) into n from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if n <> 0 then
    raise exception 'FAIL: outside manager read % cross-workspace row(s)', n;
  end if;

  update public.workspace_settings
  set labs_time_pulse_enabled = true
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'FAIL: outside manager updated % cross-workspace row(s)', n;
  end if;

  -- Same caller, own workspace: the flag is theirs to create and set.
  insert into public.workspace_settings (workspace_id, labs_time_pulse_enabled)
  values ('60000000-0000-4000-8000-0000000000b1', true);

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000b1';
  if flag is not true then
    raise exception 'FAIL: manager could not set the flag in their own workspace, got %', flag;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Final state, checked as the owning role because RLS would otherwise hide
--    the rows rather than prove them. Nothing staff or the outside manager
--    attempted changed the workspace under test, and each workspace holds
--    exactly the one row its own members created.
-- ---------------------------------------------------------------------------
reset role;

do $$
declare
  n integer;
  flag boolean;
begin
  select count(*) into n from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if n <> 1 then
    raise exception 'FAIL: expected exactly 1 settings row under test, found %', n;
  end if;

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000a1';
  if flag is not false then
    raise exception 'FAIL: a denied caller changed the stored flag to %', flag;
  end if;

  select labs_time_pulse_enabled into flag
  from public.workspace_settings
  where workspace_id = '60000000-0000-4000-8000-0000000000b1';
  if flag is not true then
    raise exception 'FAIL: the other workspace lost its own flag, got %', flag;
  end if;
end;
$$;

rollback;
