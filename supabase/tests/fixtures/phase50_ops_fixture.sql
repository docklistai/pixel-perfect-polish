insert into auth.users (instance_id, id, aud, role, email) values
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000001','authenticated','authenticated','ops.owner@example.com'),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000002','authenticated','authenticated','ops.manager@example.com'),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000003','authenticated','authenticated','ops.staff@example.com'),
('00000000-0000-0000-0000-000000000000','f5000000-0000-4000-8000-000000000004','authenticated','authenticated','ops.foreign@example.com');

insert into public.workspaces (id, slug, name, timezone) values
('f5010000-0000-4000-8000-000000000001','phase50-ops','Phase 50 Ops','Pacific/Kiritimati'),
('f5010000-0000-4000-8000-000000000002','phase50-other','Phase 50 Other','UTC');
insert into public.locations (id, workspace_id, name, timezone) values
('f5020000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','Ops Venue','Pacific/Kiritimati'),
('f5020000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000002','Other Venue','UTC');
insert into public.departments (id, workspace_id, name) values
('f5030000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','Operations'),
('f5030000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000002','Other');
insert into public.workspace_memberships (id, workspace_id, user_id, role, status, invited_at, joined_at) values
('f5040000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000001','owner','active',now(),now()),
('f5040000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000002','manager','active',now(),now()),
('f5040000-0000-4000-8000-000000000003','f5010000-0000-4000-8000-000000000001','f5000000-0000-4000-8000-000000000003','staff','active',now(),now()),
('f5040000-0000-4000-8000-000000000004','f5010000-0000-4000-8000-000000000002','f5000000-0000-4000-8000-000000000004','owner','active',now(),now());
insert into public.staff_members (id, workspace_id, membership_id, primary_location_id, department_id,
  display_name, role_name, employment_status) values
('f5050000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000001','f5020000-0000-4000-8000-000000000001','f5030000-0000-4000-8000-000000000001','Olivia Owner','Manager','active'),
('f5050000-0000-4000-8000-000000000002','f5010000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000002','f5020000-0000-4000-8000-000000000001','f5030000-0000-4000-8000-000000000001','Manny Manager','Manager','active'),
('f5050000-0000-4000-8000-000000000003','f5010000-0000-4000-8000-000000000001','f5040000-0000-4000-8000-000000000003','f5020000-0000-4000-8000-000000000001','f5030000-0000-4000-8000-000000000001','Stevie Staff','Operator','active'),
('f5050000-0000-4000-8000-000000000004','f5010000-0000-4000-8000-000000000002','f5040000-0000-4000-8000-000000000004','f5020000-0000-4000-8000-000000000002','f5030000-0000-4000-8000-000000000002','Freddie Foreign','Other','active');

insert into public.rota_weeks (id, workspace_id, location_id, week_start, status) values
('f5060000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001',date_trunc('week', now() at time zone 'Pacific/Kiritimati')::date,'draft');
insert into public.shifts (id, workspace_id, rota_week_id, location_id, department_id, staff_member_id,
  shift_date, starts_at, ends_at, role_name, assignment_status) values
('f5070000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','f5060000-0000-4000-8000-000000000001',
 'f5020000-0000-4000-8000-000000000001','f5030000-0000-4000-8000-000000000001','f5050000-0000-4000-8000-000000000003',
 (now() at time zone 'Pacific/Kiritimati')::date, now() - interval '1 hour', now() + interval '7 hours','Operator','scheduled');
update public.rota_weeks set status='published' where id='f5060000-0000-4000-8000-000000000001';
insert into public.published_rota_snapshots (id, workspace_id, rota_week_id, version, published_at, published_by_membership_id)
values ('f5080000-0000-4000-8000-000000000001','f5010000-0000-4000-8000-000000000001','f5060000-0000-4000-8000-000000000001',1,now(),'f5040000-0000-4000-8000-000000000001');
insert into public.published_rota_shifts (workspace_id, snapshot_id, source_shift_id, location_id, department_id,
  staff_member_id, shift_date, starts_at, ends_at, role_name, assignment_status)
select workspace_id,'f5080000-0000-4000-8000-000000000001',id,location_id,department_id,staff_member_id,
  shift_date,starts_at,ends_at,role_name,assignment_status from public.shifts
where id='f5070000-0000-4000-8000-000000000001';

select set_config('request.jwt.claims',
  '{"sub":"f5000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
set local role authenticated;
