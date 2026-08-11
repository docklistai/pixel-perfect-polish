-- Phase 55 Team-live authority verification. Runs inside one rolled-back
-- transaction against the local stack; the seeded database is left untouched.
--
--   docker exec -i supabase_db_pixel-perfect-polish psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/phase55_team_live_tests.sql
--
-- Covers the authority questions that decide whether Team can be trusted live:
-- who may publish, who the recipients actually are, who may acknowledge, what a
-- staff member can see of other staff, and whether the Phase 30 notification
-- authority survived the new write path.

begin;

-- ---------------------------------------------------------------------------
-- Identities. The seed ships one active manager; staff arrive as 'invited'
-- with no auth user, so two are promoted to active to exercise recipient reads.
-- ---------------------------------------------------------------------------

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a5500000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'sophie.phase55@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5500000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'daniel.phase55@example.test');

-- Sophie Carter — Front of House. Daniel Mitchell — Kitchen.
update public.workspace_memberships
set user_id = 'a5500000-0000-4000-8000-000000000001', status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000002';
update public.workspace_memberships
set user_id = 'a5500000-0000-4000-8000-000000000002', status = 'active',
    joined_at = '2026-06-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000003';

-- A separate workspace for the isolation assertions.
insert into public.workspaces (id, slug, name, timezone, status)
values ('55000000-0000-4000-8000-0000000000f1', 'phase55-other', 'Other Co',
        'Europe/London', 'active');
insert into public.departments (id, workspace_id, name, status)
values ('55000000-0000-4000-8000-0000000000f2', '55000000-0000-4000-8000-0000000000f1',
        'Other Dept', 'active');

do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  other_ws constant uuid := '55000000-0000-4000-8000-0000000000f1';
  manager constant uuid := '13000000-0000-4000-8000-000000000011';
  kitchen constant uuid := '12000000-0000-4000-8000-000000000002';
  foh constant uuid := '12000000-0000-4000-8000-000000000001';
  sophie_staff constant uuid := '14000000-0000-4000-8000-000000000001';
  daniel_staff constant uuid := '14000000-0000-4000-8000-000000000002';
  all_staff_id uuid; kitchen_id uuid; second_id uuid;
  v_reminder_id uuid; n integer; response jsonb; failed boolean; err text;
begin
  -- =========================================================================
  -- 1. Manager may publish; the audience becomes a real recipient set.
  -- =========================================================================
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

  response := public.rpc_team_create_announcement(
    ws, gen_random_uuid(), 'Summer menu launch',
    'Please read the new summer menu before Monday service.',
    'all_staff', null, true, true, true);
  all_staff_id := (response->>'announcement_id')::uuid;

  select count(*) into n from public.team_announcement_recipients
  where workspace_id = ws and announcement_id = all_staff_id;
  if n <> 8 then
    raise exception 'FAIL: all-staff audience resolved % recipients, expected the 8 seeded staff', n;
  end if;
  if (response->>'recipient_count')::int <> 8 then
    raise exception 'FAIL: reported recipient_count % disagrees with the rows written', response->>'recipient_count';
  end if;

  -- One member appears exactly once, even though the resolver runs twice.
  select count(*) into n from (
    select recipient_membership_id from public.team_announcement_recipients
    where workspace_id = ws and announcement_id = all_staff_id
    group by recipient_membership_id having count(*) > 1
  ) as duplicated;
  if n <> 0 then
    raise exception 'FAIL: % membership(s) received duplicate recipient rows', n;
  end if;

  -- No manager is swept into an all-staff broadcast.
  select count(*) into n
  from public.team_announcement_recipients as recipient
  join public.workspace_memberships as membership
    on membership.workspace_id = recipient.workspace_id
   and membership.id = recipient.recipient_membership_id
  where recipient.workspace_id = ws and recipient.announcement_id = all_staff_id
    and membership.role <> 'staff';
  if n <> 0 then
    raise exception 'FAIL: % non-staff membership(s) received an all-staff broadcast', n;
  end if;

  -- =========================================================================
  -- 2. Delivery reaches the existing notification infrastructure.
  -- =========================================================================
  select count(*) into n
  from public.notifications as notification
  join public.notification_deliveries as delivery
    on delivery.workspace_id = notification.workspace_id
   and delivery.notification_id = notification.id
  where notification.workspace_id = ws and notification.kind = 'announcement'
    and notification.related_entity_type = 'team_announcement'
    and notification.related_entity_id = all_staff_id;
  if n <> 8 then
    raise exception 'FAIL: announcement produced % notification deliveries, expected 8', n;
  end if;

  -- =========================================================================
  -- 3. Department audience reaches only that department.
  -- =========================================================================
  response := public.rpc_team_create_announcement(
    ws, gen_random_uuid(), 'Kitchen deep clean', 'Kitchen only: deep clean Thursday.',
    'department', kitchen, false, true, true);
  kitchen_id := (response->>'announcement_id')::uuid;

  select count(*) into n from public.team_announcement_recipients
  where workspace_id = ws and announcement_id = kitchen_id;
  if n <> 2 then
    raise exception 'FAIL: kitchen audience resolved % recipients, expected 2', n;
  end if;

  select count(*) into n
  from public.team_announcement_recipients as recipient
  join public.staff_members as staff
    on staff.workspace_id = recipient.workspace_id and staff.id = recipient.staff_member_id
  where recipient.workspace_id = ws and recipient.announcement_id = kitchen_id
    and staff.department_id is distinct from kitchen;
  if n <> 0 then
    raise exception 'FAIL: % recipient(s) outside Kitchen received a Kitchen-only announcement', n;
  end if;

  -- =========================================================================
  -- 4. Validation refusals.
  -- =========================================================================
  failed := false;
  begin
    perform public.rpc_team_create_announcement(
      ws, gen_random_uuid(), '   ', 'body', 'all_staff', null, false, true, true);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: a blank subject was accepted'; end if;

  failed := false;
  begin
    perform public.rpc_team_create_announcement(
      ws, gen_random_uuid(), 'Title', 'body', 'department', null, false, true, true);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: a department audience with no department was accepted'; end if;

  -- A department from another workspace must never resolve.
  failed := false;
  begin
    perform public.rpc_team_create_announcement(
      ws, gen_random_uuid(), 'Title', 'body', 'department',
      '55000000-0000-4000-8000-0000000000f2', false, true, true);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: a cross-workspace department audience was accepted'; end if;

  -- Publishing into a workspace the caller does not manage.
  failed := false;
  begin
    perform public.rpc_team_create_announcement(
      other_ws, gen_random_uuid(), 'Title', 'body', 'all_staff', null, false, true, true);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: a manager published into another workspace'; end if;

  -- =========================================================================
  -- 5. Manager comments attach to exactly one announcement.
  -- =========================================================================
  perform public.rpc_team_add_announcement_comment(
    ws, gen_random_uuid(), all_staff_id, 'Briefing the FOH team at handover.');

  select count(*) into n from public.team_announcement_comments
  where workspace_id = ws and announcement_id = all_staff_id;
  if n <> 1 then raise exception 'FAIL: expected 1 comment on the all-staff announcement, found %', n; end if;

  select count(*) into n from public.team_announcement_comments
  where workspace_id = ws and announcement_id = kitchen_id;
  if n <> 0 then
    raise exception 'FAIL: comment bled onto a second announcement (% found)', n;
  end if;

  -- The real Export path must return the complete roster, not merely compile.
  select count(*) into n
  from public.rpc_team_export_announcement_roster(ws, all_staff_id);
  if n <> 8 then
    raise exception 'FAIL: announcement export returned % rows, expected 8', n;
  end if;

  -- =========================================================================
  -- 6. Training reminders: tenancy, assignment and completion.
  -- =========================================================================
  response := public.rpc_team_create_training_reminder(
    ws, gen_random_uuid(), 'Food safety refresher', 'staff_records', 'department',
    kitchen, transaction_timestamp() + interval '3 days', true);
  v_reminder_id := (response->>'reminder_id')::uuid;

  -- Completion may only be recorded for an assigned staff member.
  failed := false;
  begin
    perform public.rpc_team_record_training_completion(
      ws, gen_random_uuid(), v_reminder_id, sophie_staff);
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'FAIL: completion was recorded for a staff member outside the assigned audience';
  end if;

  response := public.rpc_team_record_training_completion(
    ws, gen_random_uuid(), v_reminder_id, daniel_staff);
  if (response->>'completed_count')::int <> 1 or (response->>'assigned_count')::int <> 2 then
    raise exception 'FAIL: completion counters were % of %',
      response->>'completed_count', response->>'assigned_count';
  end if;

  -- Completions are retained: they cannot be edited or withdrawn. The guard,
  -- not an incidental error, must be what stops it — so assert the SQLSTATE.
  err := null;
  begin
    delete from public.team_training_reminder_completions
    where workspace_id = ws and reminder_id = v_reminder_id;
  exception when others then err := sqlstate;
  end;
  if err is distinct from '55000' then
    raise exception 'FAIL: deleting a training completion raised %, expected the 55000 retention guard',
      coalesce(err, 'nothing');
  end if;

  -- =========================================================================
  -- 7. Birthdays: manager-set, manager-only, no year stored.
  -- =========================================================================
  perform public.rpc_team_set_staff_birthday(
    ws, gen_random_uuid(), sophie_staff, 9::smallint, 6::smallint);

  select count(*) into n from public.staff_members
  where workspace_id = ws and id = sophie_staff and birth_day = 9 and birth_month = 6;
  if n <> 1 then raise exception 'FAIL: birthday was not stored'; end if;

  failed := false;
  begin
    perform public.rpc_team_set_staff_birthday(
      ws, gen_random_uuid(), sophie_staff, 31::smallint, 2::smallint);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: 31 February was accepted as a birthday'; end if;

  failed := false;
  begin
    perform public.rpc_team_set_staff_birthday(
      ws, gen_random_uuid(), sophie_staff, 9::smallint, null);
  exception when others then failed := true;
  end;
  if not failed then raise exception 'FAIL: a half-set birthday was accepted'; end if;

  -- 29 February remains stored as-is but uses 28 February for reminders in a
  -- non-leap year. Normal dates and leap years retain their calendar date.
  if public.team_birthday_reminder_date(2026, 2::smallint, 29::smallint)
       <> date '2026-02-28'
     or public.team_birthday_reminder_date(2028, 2::smallint, 29::smallint)
       <> date '2028-02-29'
     or public.team_birthday_reminder_date(2026, 6::smallint, 9::smallint)
       <> date '2026-06-09' then
    raise exception 'FAIL: birthday reminder date mapping is incorrect';
  end if;

  perform public.rpc_team_set_staff_birthday(
    ws, gen_random_uuid(), sophie_staff, 29::smallint, 2::smallint);

  perform public.rpc_team_acknowledge_birthday(
    ws, gen_random_uuid(), sophie_staff,
    extract(year from transaction_timestamp())::smallint);

  select count(*) into n from public.team_birthday_acknowledgements
  where workspace_id = ws and staff_member_id = sophie_staff;
  if n <> 1 then raise exception 'FAIL: birthday acknowledgement was not recorded'; end if;

  -- =========================================================================
  -- 8. Staff events are workspace scoped.
  -- =========================================================================
  perform public.rpc_team_create_staff_event(
    ws, gen_random_uuid(), 'Summer social', transaction_timestamp() + interval '10 days');
  select count(*) into n from public.team_staff_events where workspace_id = ws;
  if n <> 1 then raise exception 'FAIL: expected 1 staff event, found %', n; end if;

  -- =========================================================================
  -- 9. Audit evidence exists for the meaningful manager actions.
  -- =========================================================================
  select count(*) into n from public.audit_events
  where workspace_id = ws and action in (
    'team.announcement_published', 'team.training_reminder_created',
    'team.training_completion_recorded', 'team.birthday_set');
  if n < 4 then
    raise exception 'FAIL: expected audit rows for publish/training/birthday, found %', n;
  end if;

  -- =========================================================================
  -- 10. Read model returns arrays, never nulls (the Phase 50 lesson).
  -- =========================================================================
  response := public.rpc_team_read_page(ws);
  if jsonb_typeof(response->'announcements') <> 'array'
     or jsonb_typeof(response->'trainingReminders') <> 'array'
     or jsonb_typeof(response->'birthdays') <> 'array'
     or jsonb_typeof(response->'staffEvents') <> 'array'
     or jsonb_typeof(response->'audiences') <> 'array' then
    raise exception 'FAIL: read model returned a non-array collection: %', response;
  end if;
  if jsonb_array_length(response->'announcements') <> 2 then
    raise exception 'FAIL: read model returned % announcements, expected 2',
      jsonb_array_length(response->'announcements');
  end if;

  -- Derived counts, not stored aggregates.
  if (response->'announcements'->0->>'recipientCount')::int
     + (response->'announcements'->1->>'recipientCount')::int <> 10 then
    raise exception 'FAIL: derived recipient counts do not total 10';
  end if;

  perform set_config('request.jwt.claims', null, true);

  -- =========================================================================
  -- 11. A staff member may not author, and may only move their own row.
  -- =========================================================================
  perform set_config('request.jwt.claims',
    '{"sub":"a5500000-0000-4000-8000-000000000001","role":"authenticated"}', true);

  -- Each refusal must be the role gate (42501), not a validation or lookup
  -- error that would happen to hide a missing gate.
  err := null;
  begin
    perform public.rpc_team_create_announcement(
      ws, gen_random_uuid(), 'Staff attempt', 'body', 'all_staff', null, false, true, true);
  exception when others then err := sqlstate;
  end;
  if err is distinct from '42501' then
    raise exception 'FAIL: staff publishing raised %, expected the 42501 role gate', coalesce(err, 'nothing');
  end if;

  err := null;
  begin
    perform public.rpc_team_add_announcement_comment(
      ws, gen_random_uuid(), all_staff_id, 'staff note');
  exception when others then err := sqlstate;
  end;
  if err is distinct from '42501' then
    raise exception 'FAIL: staff commenting raised %, expected the 42501 role gate', coalesce(err, 'nothing');
  end if;

  err := null;
  begin
    perform public.rpc_team_read_page(ws);
  exception when others then err := sqlstate;
  end;
  if err is distinct from '42501' then
    raise exception 'FAIL: staff reading the manager page raised %, expected the 42501 role gate',
      coalesce(err, 'nothing');
  end if;

  -- Sophie acknowledges her OWN delivery.
  response := public.rpc_team_acknowledge_announcement(ws, gen_random_uuid(), all_staff_id);
  if (response->>'changed')::boolean is not true then
    raise exception 'FAIL: the recipient acknowledgement did not take effect';
  end if;

  select count(*) into n from public.team_announcement_recipients
  where workspace_id = ws and announcement_id = all_staff_id
    and recipient_membership_id = '13000000-0000-4000-8000-000000000002'
    and acknowledged_at is not null and read_at is not null;
  if n <> 1 then
    raise exception 'FAIL: acknowledgement did not set the recipient row (read_at must follow too)';
  end if;

  -- Exactly one acknowledgement exists — she cannot move anyone else.
  select count(*) into n from public.team_announcement_recipients
  where workspace_id = ws and announcement_id = all_staff_id and acknowledged_at is not null;
  if n <> 1 then
    raise exception 'FAIL: % acknowledgements exist after one staff member acted', n;
  end if;

  -- A staff member is not a recipient of the Kitchen announcement she is not in.
  failed := false;
  begin
    perform public.rpc_team_acknowledge_announcement(ws, gen_random_uuid(), kitchen_id);
  exception when others then failed := true;
  end;
  if not failed then
    raise exception 'FAIL: a non-recipient acknowledged an announcement they never received';
  end if;

  perform set_config('request.jwt.claims', null, true);

  -- =========================================================================
  -- 12. Phase 30 notification authority survived.
  -- =========================================================================
  if has_function_privilege('authenticated',
       'public.rpc_internal_notify(uuid, uuid, text, text, text, text, uuid, uuid[])', 'execute') then
    raise exception 'FAIL: rpc_internal_notify became executable by authenticated';
  end if;
  if has_function_privilege('authenticated',
       'public.rpc_internal_team_audience(uuid, text, uuid)', 'execute') then
    raise exception 'FAIL: the recipient resolver became directly callable by a client';
  end if;
  if has_table_privilege('authenticated', 'public.notifications', 'insert')
     or has_table_privilege('authenticated', 'public.notification_deliveries', 'insert') then
    raise exception 'FAIL: direct notification inserts were re-granted to authenticated';
  end if;
  if has_table_privilege('authenticated', 'public.team_announcements', 'insert')
     or has_table_privilege('authenticated', 'public.team_announcement_recipients', 'update') then
    raise exception 'FAIL: Team tables gained a direct client write path';
  end if;

  -- Announcements are immutable once published.
  err := null;
  begin
    update public.team_announcements set title = 'edited' where workspace_id = ws and id = all_staff_id;
  exception when others then err := sqlstate;
  end;
  if err is distinct from '55000' then
    raise exception 'FAIL: editing a published announcement raised %, expected the 55000 guard',
      coalesce(err, 'nothing');
  end if;

  -- An acknowledgement cannot be rewritten or withdrawn.
  err := null;
  begin
    update public.team_announcement_recipients set acknowledged_at = null
    where workspace_id = ws and announcement_id = all_staff_id
      and recipient_membership_id = '13000000-0000-4000-8000-000000000002';
  exception when others then err := sqlstate;
  end;
  if err is distinct from '55000' then
    raise exception 'FAIL: withdrawing an acknowledgement raised %, expected the 55000 guard',
      coalesce(err, 'nothing');
  end if;

  raise notice 'phase55: all Team-live authority assertions passed';
end $$;

rollback;
