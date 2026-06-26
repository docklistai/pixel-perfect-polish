-- Phase 8: self-service first-workspace bootstrap.
-- Additive only: no RLS policy, table grant, or membership guard changes.

create or replace function public.rpc_bootstrap_workspace(
  p_workspace_name text,
  p_slug text default null,
  p_timezone text default 'Europe/London',
  p_location_name text default 'Main location',
  p_department_name text default 'Front of house'
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller uuid := auth.uid();
  v_workspace_name text := pg_catalog.btrim(coalesce(p_workspace_name, ''));
  v_slug_input text := pg_catalog.btrim(coalesce(p_slug, ''));
  v_slug_base text;
  v_slug text;
  v_slug_was_provided boolean := false;
  v_timezone text := coalesce(nullif(pg_catalog.btrim(coalesce(p_timezone, '')), ''), 'Europe/London');
  v_location_name text := coalesce(nullif(pg_catalog.btrim(coalesce(p_location_name, '')), ''), 'Main location');
  v_department_name text := coalesce(nullif(pg_catalog.btrim(coalesce(p_department_name, '')), ''), 'Front of house');
  v_workspace_id uuid;
  v_membership_id uuid;
  v_location_id uuid;
  v_department_id uuid;
  v_claims text;
  v_claim_sub text;
begin
  if v_caller is null then
    raise exception 'workspace bootstrap requires an authenticated user'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workspace_memberships as membership
    where membership.user_id = v_caller
      and membership.status = 'active'
  ) then
    raise exception 'caller already has an active workspace membership'
      using errcode = '55000';
  end if;

  if v_workspace_name = '' or pg_catalog.length(v_workspace_name) > 120 then
    raise exception 'workspace name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_location_name = '' or pg_catalog.length(v_location_name) > 120 then
    raise exception 'location name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_department_name = '' or pg_catalog.length(v_department_name) > 120 then
    raise exception 'department name must be between 1 and 120 characters'
      using errcode = '22023';
  end if;

  if v_timezone = '' or pg_catalog.length(v_timezone) > 80 or not exists (
    select 1 from pg_catalog.pg_timezone_names where name = v_timezone
  ) then
    raise exception 'timezone is not valid'
      using errcode = '22023';
  end if;

  if v_slug_input <> '' then
    v_slug_was_provided := true;
    if v_slug_input <> pg_catalog.lower(v_slug_input)
       or pg_catalog.length(v_slug_input) > 80
       or v_slug_input !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
      raise exception 'workspace slug must be lower-case letters, numbers, and hyphens'
        using errcode = '22023';
    end if;
    v_slug := v_slug_input;
  else
    v_slug_base := pg_catalog.regexp_replace(pg_catalog.lower(v_workspace_name), '[^a-z0-9]+', '-', 'g');
    v_slug_base := pg_catalog.regexp_replace(v_slug_base, '(^-+|-+$)', '', 'g');
    if v_slug_base = '' then
      v_slug_base := 'workspace';
    end if;
    v_slug_base := pg_catalog.substr(v_slug_base, 1, 72);
    v_slug_base := pg_catalog.regexp_replace(v_slug_base, '-+$', '', 'g');
    if v_slug_base = '' then
      v_slug_base := 'workspace';
    end if;
    v_slug := v_slug_base;
  end if;

  if v_slug_was_provided and exists (select 1 from public.workspaces where slug = v_slug) then
    raise exception 'workspace slug already exists'
      using errcode = '23505';
  end if;

  while exists (select 1 from public.workspaces where slug = v_slug) loop
    v_slug := v_slug_base || '-' || pg_catalog.substr(pg_catalog.replace(gen_random_uuid()::text, '-', ''), 1, 6);
  end loop;

  insert into public.workspaces (slug, name, timezone, status)
  values (v_slug, v_workspace_name, v_timezone, 'active')
  returning id into v_workspace_id;

  -- Existing guard_workspace_membership_change treats null auth.uid() as the
  -- trusted service path. Capture and verify the caller first, then clear only
  -- the request-local claims while inserting the initial owner membership.
  v_claims := pg_catalog.current_setting('request.jwt.claims', true);
  v_claim_sub := pg_catalog.current_setting('request.jwt.claim.sub', true);
  begin
    perform pg_catalog.set_config('request.jwt.claims', '', true);
    perform pg_catalog.set_config('request.jwt.claim.sub', '', true);

    insert into public.workspace_memberships (
      workspace_id,
      user_id,
      role,
      status,
      invited_at,
      joined_at
    )
    values (
      v_workspace_id,
      v_caller,
      'owner',
      'active',
      pg_catalog.transaction_timestamp(),
      pg_catalog.transaction_timestamp()
    )
    returning id into v_membership_id;

    perform pg_catalog.set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(v_claim_sub, ''), true);
  exception when others then
    perform pg_catalog.set_config('request.jwt.claims', coalesce(v_claims, ''), true);
    perform pg_catalog.set_config('request.jwt.claim.sub', coalesce(v_claim_sub, ''), true);
    raise;
  end;

  insert into public.locations (workspace_id, name, timezone, status)
  values (v_workspace_id, v_location_name, v_timezone, 'active')
  returning id into v_location_id;

  insert into public.departments (workspace_id, name, status)
  values (v_workspace_id, v_department_name, 'active')
  returning id into v_department_id;

  return pg_catalog.jsonb_build_object(
    'workspace_id', v_workspace_id,
    'workspace', pg_catalog.jsonb_build_object(
      'id', v_workspace_id,
      'name', v_workspace_name,
      'slug', v_slug,
      'timezone', v_timezone
    ),
    'membership', pg_catalog.jsonb_build_object(
      'id', v_membership_id,
      'role', 'owner',
      'status', 'active'
    ),
    'location', pg_catalog.jsonb_build_object(
      'id', v_location_id,
      'name', v_location_name,
      'timezone', v_timezone
    ),
    'department', pg_catalog.jsonb_build_object(
      'id', v_department_id,
      'name', v_department_name
    )
  );
end;
$$;

revoke all on function public.rpc_bootstrap_workspace(text, text, text, text, text) from public;
revoke all on function public.rpc_bootstrap_workspace(text, text, text, text, text) from anon;
grant execute on function public.rpc_bootstrap_workspace(text, text, text, text, text) to authenticated;

comment on function public.rpc_bootstrap_workspace(text, text, text, text, text)
is 'Creates the first active owner workspace membership plus starter location and department for an authenticated user with no active workspace membership.';
