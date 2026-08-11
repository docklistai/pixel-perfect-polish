-- Phase 55 birthday-occurrence regression coverage. The production read model
-- uses the same internal helper tested here; fixed reference dates keep the
-- New-Year and leap-day assertions deterministic without a production clock
-- override. All writes roll back.

begin;

do $$
declare
  ordered_labels text[];
begin
  if public.team_birthday_reminder_occurrence(date '2026-12-20', 1, 5)
       is distinct from date '2027-01-05' then
    raise exception 'FAIL: 5 Jan did not resolve to the next-year occurrence';
  end if;

  if public.team_birthday_reminder_occurrence(date '2026-01-03', 12, 30)
       is distinct from date '2025-12-30' then
    raise exception 'FAIL: 30 Dec did not resolve to the previous-year occurrence';
  end if;

  if public.team_birthday_reminder_occurrence(date '2026-12-20', 2, 1) is not null then
    raise exception 'FAIL: an occurrence outside the -7/+21 day window was included';
  end if;

  select array_agg(candidate.label order by candidate.occurrence_date)
  into ordered_labels
  from (
    select input.label,
           public.team_birthday_reminder_occurrence(
             date '2026-12-20', input.birth_month, input.birth_day
           ) as occurrence_date
    from (values
      ('28 Dec'::text, 12::smallint, 28::smallint),
      ('2 Jan'::text, 1::smallint, 2::smallint),
      ('10 Jan'::text, 1::smallint, 10::smallint)
    ) as input(label, birth_month, birth_day)
  ) as candidate;
  if ordered_labels is distinct from array['28 Dec', '2 Jan', '10 Jan']::text[] then
    raise exception 'FAIL: birthday occurrences ordered %, expected chronological New-Year order',
      ordered_labels;
  end if;

  if public.team_birthday_reminder_occurrence(date '2026-02-20', 2, 29)
       is distinct from date '2026-02-28' then
    raise exception 'FAIL: non-leap 29 February occurrence did not resolve to 28 February';
  end if;
  if public.team_birthday_reminder_occurrence(date '2028-02-20', 2, 29)
       is distinct from date '2028-02-29' then
    raise exception 'FAIL: leap-year 29 February occurrence did not remain 29 February';
  end if;
  if public.team_birthday_reminder_occurrence(date '2026-08-10', 8, 15)
       is distinct from date '2026-08-15' then
    raise exception 'FAIL: normal same-year birthday occurrence changed';
  end if;
end $$;

do $$
declare
  ws constant uuid := '10000000-0000-4000-8000-000000000001';
  sophie constant uuid := '14000000-0000-4000-8000-000000000001';
  daniel constant uuid := '14000000-0000-4000-8000-000000000002';
  olivia constant uuid := '14000000-0000-4000-8000-000000000005';
  today_local date;
  page jsonb;
  birthday jsonb;
  response jsonb;
  n integer;
begin
  perform set_config(
    'request.jwt.claims',
    '{"sub":"ab000000-0000-4000-8000-000000000001","role":"authenticated"}',
    true
  );

  today_local := (transaction_timestamp() at time zone 'Europe/London')::date;
  update public.staff_members
  set birth_day = extract(day from today_local)::smallint,
      birth_month = extract(month from today_local)::smallint
  where workspace_id = ws and id = sophie;

  page := public.rpc_team_read_page(ws);
  select item into birthday
  from jsonb_array_elements(page->'birthdays') as item
  where item->>'staffMemberId' = sophie::text;
  if birthday is null
     or birthday->>'occurrenceDate' is distinct from today_local::text
     or (birthday->>'occurrenceYear')::integer
          is distinct from extract(year from today_local)::integer then
    raise exception 'FAIL: read model occurrence contract was % for reference date %',
      birthday, today_local;
  end if;

  update public.staff_members set birth_day = 5, birth_month = 1
  where workspace_id = ws and id = sophie;
  response := public.rpc_team_acknowledge_birthday(
    ws, gen_random_uuid(), sophie,
    extract(year from public.team_birthday_reminder_occurrence(
      date '2026-12-20', 1, 5
    ))::smallint
  );
  if response->>'changed' is distinct from 'true' then
    raise exception 'FAIL: next-year acknowledgement did not insert';
  end if;
  select count(*) into n from public.team_birthday_acknowledgements
  where workspace_id = ws and staff_member_id = sophie and birthday_year = 2027;
  if n <> 1 or exists (
    select 1 from public.team_birthday_acknowledgements
    where workspace_id = ws and staff_member_id = sophie and birthday_year = 2026
  ) then
    raise exception 'FAIL: next-year reminder acknowledgement was not isolated to 2027';
  end if;

  response := public.rpc_team_acknowledge_birthday(
    ws, gen_random_uuid(), sophie, 2027::smallint
  );
  if response->>'changed' is distinct from 'false' then
    raise exception 'FAIL: repeated acknowledgement for the same occurrence was not idempotent';
  end if;

  update public.staff_members set birth_day = 30, birth_month = 12
  where workspace_id = ws and id = daniel;
  perform public.rpc_team_acknowledge_birthday(
    ws, gen_random_uuid(), daniel, 2025::smallint
  );
  if not exists (
    select 1 from public.team_birthday_acknowledgements
    where workspace_id = ws and staff_member_id = daniel and birthday_year = 2025
  ) or exists (
    select 1 from public.team_birthday_acknowledgements
    where workspace_id = ws and staff_member_id = daniel and birthday_year = 2026
  ) then
    raise exception 'FAIL: previous-year reminder acknowledgement was not isolated to 2025';
  end if;

  update public.staff_members set birth_day = 15, birth_month = 8
  where workspace_id = ws and id = olivia;
  perform public.rpc_team_acknowledge_birthday(
    ws, gen_random_uuid(), olivia, 2026::smallint
  );
  if not exists (
    select 1 from public.team_birthday_acknowledgements
    where workspace_id = ws and staff_member_id = olivia and birthday_year = 2026
  ) then
    raise exception 'FAIL: normal current-year acknowledgement regressed';
  end if;
end $$;

rollback;
