-- Phase 55 authenticated staff-safe announcement proof. Unlike the broad Team
-- suite, every view assertion runs as the real authenticated PostgreSQL role.

begin;

insert into auth.users (instance_id, id, aud, role, email)
values
  ('00000000-0000-0000-0000-000000000000', 'a5510000-0000-4000-8000-000000000001',
   'authenticated', 'authenticated', 'staff-a.phase55@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5510000-0000-4000-8000-000000000002',
   'authenticated', 'authenticated', 'staff-b.phase55@example.test'),
  ('00000000-0000-0000-0000-000000000000', 'a5510000-0000-4000-8000-000000000003',
   'authenticated', 'authenticated', 'other-staff.phase55@example.test');

update public.workspace_memberships
set user_id = 'a5510000-0000-4000-8000-000000000001', status = 'active',
    joined_at = '2026-08-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000002';

update public.workspace_memberships
set user_id = 'a5510000-0000-4000-8000-000000000002', status = 'active',
    joined_at = '2026-08-01T09:00:00Z'
where id = '13000000-0000-4000-8000-000000000003';

insert into public.workspaces (id, slug, name, timezone, status)
values ('55100000-0000-4000-8000-000000000001', 'phase55-access-other',
        'Phase 55 Other Workspace', 'Europe/London', 'active');

insert into public.workspace_memberships (
  id, workspace_id, user_id, role, status, invited_at, joined_at
) values
  ('55100000-0000-4000-8000-000000000002',
   '55100000-0000-4000-8000-000000000001', null, 'manager', 'invited',
   '2026-08-01T08:00:00Z', null),
  ('55100000-0000-4000-8000-000000000003',
   '55100000-0000-4000-8000-000000000001',
   'a5510000-0000-4000-8000-000000000003', 'staff', 'active',
   '2026-08-01T08:00:00Z', '2026-08-01T09:00:00Z');

insert into public.team_announcements (
  id, workspace_id, title, body, audience_kind, pinned,
  requires_acknowledgement, highlight_in_updates, authored_by_membership_id
) values (
  '55100000-0000-4000-8000-000000000004',
  '55100000-0000-4000-8000-000000000001',
  'Other workspace private update', 'Must never cross the workspace boundary.',
  'all_staff', false, true, true,
  '55100000-0000-4000-8000-000000000002'
);

insert into public.team_announcement_recipients (
  workspace_id, announcement_id, recipient_membership_id
) values (
  '55100000-0000-4000-8000-000000000001',
  '55100000-0000-4000-8000-000000000004',
  '55100000-0000-4000-8000-000000000003'
);

do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  kitchen constant uuid := '12000000-0000-4000-8000-000000000002';
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);

  perform public.rpc_team_create_announcement(
    ws, gen_random_uuid(), 'Phase 55 staff-safe all staff',
    'Staff A and Staff B may read only their own delivery.',
    'all_staff', null, true, true, true);

  perform public.rpc_team_create_announcement(
    ws, gen_random_uuid(), 'Phase 55 staff-safe Kitchen',
    'Only Kitchen recipients may read this delivery.',
    'department', kitchen, false, true, false);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5510000-0000-4000-8000-000000000001","role":"authenticated"}', true);

do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  item jsonb;
  v_announcement_id uuid;
  result jsonb;
  n integer;
begin
  select to_jsonb(announcement), announcement.announcement_id
  into item, v_announcement_id
  from public.staff_team_announcements as announcement
  where announcement.title = 'Phase 55 staff-safe all staff';

  if item is null
     or item->>'workspace_id' <> ws::text
     or (item->>'highlight_in_updates')::boolean is not true
     or item->>'read_at' is not null
     or item->>'acknowledged_at' is not null then
    raise exception 'FAIL: Staff A did not receive the exact unread highlighted shape: %', item;
  end if;

  if (item - array[
      'workspace_id', 'announcement_id', 'title', 'body', 'pinned',
      'requires_acknowledgement', 'highlight_in_updates', 'published_at',
      'delivered_at', 'read_at', 'acknowledged_at'
    ]::text[]) <> '{}'::jsonb then
    raise exception 'FAIL: staff-safe projection exposed extra fields: %', item;
  end if;

  select count(*) into n
  from public.team_announcement_recipients as recipient
  where recipient.announcement_id = v_announcement_id;
  if n <> 1 then
    raise exception 'FAIL: Staff A can see % recipient rows, expected own row only', n;
  end if;

  select count(*) into n from public.staff_team_announcements
  where title = 'Phase 55 staff-safe Kitchen';
  if n <> 0 then
    raise exception 'FAIL: non-recipient Staff A saw the Kitchen announcement';
  end if;

  select count(*) into n from public.staff_team_announcements
  where workspace_id = '55100000-0000-4000-8000-000000000001';
  if n <> 0 then
    raise exception 'FAIL: Staff A saw % cross-workspace announcement rows', n;
  end if;

  result := public.rpc_team_mark_announcement_read(ws, gen_random_uuid(), v_announcement_id);
  if (result->>'changed')::boolean is not true then
    raise exception 'FAIL: Staff A read receipt did not change';
  end if;

  result := public.rpc_team_acknowledge_announcement(ws, gen_random_uuid(), v_announcement_id);
  if (result->>'changed')::boolean is not true then
    raise exception 'FAIL: Staff A acknowledgement did not change';
  end if;

  result := public.rpc_team_acknowledge_announcement(ws, gen_random_uuid(), v_announcement_id);
  if (result->>'changed')::boolean is not false then
    raise exception 'FAIL: Staff A repeat acknowledgement was not idempotent';
  end if;

  select to_jsonb(announcement) into item
  from public.staff_team_announcements as announcement
  where announcement.announcement_id = v_announcement_id;
  if item->>'read_at' is null or item->>'acknowledged_at' is null then
    raise exception 'FAIL: Staff A own read/ack state did not return through the safe view';
  end if;
end;
$$;

reset role;
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub":"a5510000-0000-4000-8000-000000000002","role":"authenticated"}', true);

do $$
declare
  all_staff jsonb;
  kitchen jsonb;
  n integer;
begin
  select to_jsonb(announcement) into all_staff
  from public.staff_team_announcements as announcement
  where announcement.title = 'Phase 55 staff-safe all staff';

  select to_jsonb(announcement) into kitchen
  from public.staff_team_announcements as announcement
  where announcement.title = 'Phase 55 staff-safe Kitchen';

  if all_staff is null or kitchen is null
     or all_staff->>'read_at' is not null
     or all_staff->>'acknowledged_at' is not null
     or (all_staff->>'highlight_in_updates')::boolean is not true
     or (kitchen->>'highlight_in_updates')::boolean is not false then
    raise exception 'FAIL: Staff B own isolated state/highlight values are wrong: %, %',
      all_staff, kitchen;
  end if;

  select count(*) into n
  from public.team_announcement_recipients
  where announcement_id = (all_staff->>'announcement_id')::uuid;
  if n <> 1 then
    raise exception 'FAIL: Staff B can see % recipient rows, expected own row only', n;
  end if;
end;
$$;

reset role;

do $$
declare
  all_id uuid;
  staff_a_ack timestamptz;
  staff_b_ack timestamptz;
begin
  select id into all_id from public.team_announcements
  where title = 'Phase 55 staff-safe all staff';

  select acknowledged_at into staff_a_ack
  from public.team_announcement_recipients
  where announcement_id = all_id
    and recipient_membership_id = '13000000-0000-4000-8000-000000000002';

  select acknowledged_at into staff_b_ack
  from public.team_announcement_recipients
  where announcement_id = all_id
    and recipient_membership_id = '13000000-0000-4000-8000-000000000003';

  if staff_a_ack is null or staff_b_ack is not null then
    raise exception 'FAIL: recipient state crossed between Staff A and Staff B';
  end if;
end;
$$;

rollback;
