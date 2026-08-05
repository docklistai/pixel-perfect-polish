-- Phase 50: two simultaneous HTTP-equivalent retries share one receipt/result.
-- The second session must wait, then return the committed response: no duplicate
-- entry/event/audit and no 40001 serialization surface.
create extension if not exists dblink;

create or replace function public.p50_try_create(p_request uuid)
returns text language plpgsql as $$
declare result jsonb;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  result := public.rpc_ops_create_entry(
    '10000000-0000-4000-8000-000000000001',p_request,'task','P50 concurrent task',
    'One result for concurrent retries','11000000-0000-4000-8000-000000000001','Reception',
    '12000000-0000-4000-8000-000000000001',null,null,null,null,null,null,'normal',null,null,null,null);
  return result::text;
exception when others then return sqlstate || '|' || sqlerrm;
end;
$$;

create or replace function public.p50_try_handover(p_request uuid)
returns text language plpgsql as $$
declare result jsonb; local_day date;
begin
  perform set_config('request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
  select (transaction_timestamp() at time zone timezone)::date into local_day
  from public.locations where id='11000000-0000-4000-8000-000000000001';
  result := public.rpc_ops_create_handover(
    '10000000-0000-4000-8000-000000000001',p_request,
    '11000000-0000-4000-8000-000000000001',local_day,null,
    'P50 concurrent handover',array['13000000-0000-4000-8000-000000000010'::uuid],array[]::uuid[]);
  return result::text;
exception when others then return sqlstate || '|' || sqlerrm;
end;
$$;

begin;
do $$
declare request_id uuid := 'f5400000-0000-4000-8000-000000000001';
  first_result text; second_result text; waited numeric:=0; blocked boolean:=false; entry_id uuid;
begin
  perform dblink_connect('p50_a','dbname=postgres user=postgres application_name=p50_a');
  perform dblink_connect('p50_b','dbname=postgres user=postgres application_name=p50_b');
  perform dblink_exec('p50_a','begin;');
  select result into first_result from dblink('p50_a',format('select public.p50_try_create(%L);',request_id)) as value(result text);
  perform dblink_send_query('p50_b',format('select public.p50_try_create(%L);',request_id));
  while waited < 10 loop
    perform pg_stat_clear_snapshot();
    select exists(select 1 from pg_stat_activity where application_name='p50_b' and wait_event_type='Lock') into blocked;
    exit when blocked; perform pg_sleep(0.1); waited:=waited+0.1;
  end loop;
  if not blocked then raise exception 'FAIL: concurrent retry did not wait for receipt transaction'; end if;
  perform dblink_exec('p50_a','commit;');
  select result into second_result from dblink_get_result('p50_b') as value(result text);
  perform dblink_disconnect('p50_a'); perform dblink_disconnect('p50_b');
  if first_result <> second_result then raise exception 'FAIL: concurrent responses differ: % / %',first_result,second_result; end if;
  if second_result like '40001|%' or second_result like '55000|%' then
    raise exception 'FAIL: concurrent duplicate surfaced refusal %',second_result;
  end if;
  entry_id := (first_result::jsonb->>'entry_id')::uuid;
  if (select count(*) from public.ops_entries where id=entry_id) <> 1 then raise exception 'FAIL: entry count'; end if;
  if (select count(*) from public.ops_entry_events where ops_entry_id=entry_id) <> 1 then raise exception 'FAIL: event count'; end if;
  if (select count(*) from public.audit_events where subject_id=entry_id and action='ops.entry_created') <> 1 then raise exception 'FAIL: audit count'; end if;
end;
$$;
rollback;

insert into auth.users (instance_id,id,aud,role,email)
values ('00000000-0000-0000-0000-000000000000','f5990000-0000-4000-8000-000000000001',
  'authenticated','authenticated','p50.concurrent.manager@example.com');
update public.workspace_memberships set user_id='f5990000-0000-4000-8000-000000000001',
  status='active', joined_at=coalesce(joined_at,now())
where id='13000000-0000-4000-8000-000000000010';

begin;
do $$
declare request_id uuid := 'f5400000-0000-4000-8000-000000000002';
  first_result text; second_result text; target_handover_id uuid;
begin
  perform dblink_connect('p50_h_a','dbname=postgres user=postgres application_name=p50_h_a');
  perform dblink_connect('p50_h_b','dbname=postgres user=postgres application_name=p50_h_b');
  perform dblink_exec('p50_h_a','begin;');
  select result into first_result from dblink('p50_h_a',format(
    'select public.p50_try_handover(%L);',request_id)) as value(result text);
  perform dblink_send_query('p50_h_b',format('select public.p50_try_handover(%L);',request_id));
  perform pg_sleep(0.2);
  perform dblink_exec('p50_h_a','commit;');
  select result into second_result from dblink_get_result('p50_h_b') as value(result text);
  perform dblink_disconnect('p50_h_a'); perform dblink_disconnect('p50_h_b');
  if first_result <> second_result then
    raise exception 'FAIL: concurrent handover responses differ: % / %',first_result,second_result;
  end if;
  if first_result like '%|%' then
    raise exception 'FAIL: concurrent handover returned refusal %',first_result;
  end if;
  target_handover_id := (first_result::jsonb->>'handover_id')::uuid;
  if (select count(*) from public.ops_handovers where id=target_handover_id) <> 1
     or (select count(*) from public.ops_handover_recipients as recipient
       where recipient.handover_id=target_handover_id) <> 1
     or (select count(*) from public.notifications where related_entity_id=target_handover_id
       and kind='ops_handover_issued') <> 1
     or (select count(*) from public.audit_events where subject_id=target_handover_id
       and action='ops.handover_issued') <> 1 then
    raise exception 'FAIL: concurrent handover wrote duplicate collaboration rows';
  end if;
end;
$$;
rollback;

-- Remote session A committed, so remove only this suite's rows and helper.
alter table public.ops_entry_events disable trigger user;
delete from public.ops_entry_events where request_id='f5400000-0000-4000-8000-000000000001';
alter table public.ops_entry_events enable trigger user;
alter table public.audit_events disable trigger user;
delete from public.audit_events where action='ops.entry_created'
  and subject_id in (select id from public.ops_entries where title='P50 concurrent task');
alter table public.audit_events enable trigger user;
alter table public.ops_entries disable trigger user;
delete from public.ops_entries where title='P50 concurrent task';
alter table public.ops_entries enable trigger user;
alter table public.ops_rpc_requests disable trigger user;
delete from public.ops_rpc_requests where request_id='f5400000-0000-4000-8000-000000000001';
alter table public.ops_rpc_requests enable trigger user;
drop function public.p50_try_create(uuid);

alter table public.notification_deliveries disable trigger user;
delete from public.notification_deliveries where notification_id in (
  select id from public.notifications where kind='ops_handover_issued' and body='P50 concurrent handover');
alter table public.notification_deliveries enable trigger user;
alter table public.notifications disable trigger user;
delete from public.notifications where kind='ops_handover_issued' and body='P50 concurrent handover';
alter table public.notifications enable trigger user;
alter table public.audit_events disable trigger user;
delete from public.audit_events where action='ops.handover_issued'
  and subject_id in (select id from public.ops_handovers where notes='P50 concurrent handover');
alter table public.audit_events enable trigger user;
alter table public.ops_handover_recipients disable trigger user;
delete from public.ops_handover_recipients where handover_id in (
  select id from public.ops_handovers where notes='P50 concurrent handover');
alter table public.ops_handover_recipients enable trigger user;
alter table public.ops_handovers disable trigger user;
delete from public.ops_handovers where notes='P50 concurrent handover';
alter table public.ops_handovers enable trigger user;
alter table public.ops_rpc_requests disable trigger user;
delete from public.ops_rpc_requests where request_id='f5400000-0000-4000-8000-000000000002';
alter table public.ops_rpc_requests enable trigger user;
drop function public.p50_try_handover(uuid);
update public.workspace_memberships set user_id=null,status='invited', joined_at=null
where id='13000000-0000-4000-8000-000000000010';
delete from auth.users where id='f5990000-0000-4000-8000-000000000001';
