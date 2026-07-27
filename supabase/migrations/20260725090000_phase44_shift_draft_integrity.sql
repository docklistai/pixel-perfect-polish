-- Phase 44: shift write and rota-week draft transition become one transaction.
--
-- Confirmed defects this corrects:
--
--   1. Every live single-shift server function (create, update, remove, mark
--      open, duplicate, clear week) issued the shift write and the subsequent
--      `rota_weeks.status = 'draft'` update as two separate PostgREST requests.
--      The shift could commit while the second request failed or was
--      interrupted, leaving the week still marked `published` with no
--      unpublished-change warning — staff kept seeing a snapshot that no
--      longer matched the draft, and the UI reported failure for a change that
--      had in fact persisted.
--
--   2. `rpc_decline_open_shift_request` unassigns a draft shift (undoing a
--      selection) with no draft-status precondition of its own and no draft
--      transition. On a published week that silently diverged the draft from
--      the published snapshot on every successful call, not merely in a
--      failure window.
--
--   3. The remaining shift-writing RPCs — `rpc_apply_demand_template`,
--      `rpc_copy_rota_day`, `rpc_clear_rota_day`, `rpc_copy_previous_rota_week`,
--      `rpc_select_open_shift_applicant` and `rpc_approve_shift_release` —
--      already refuse a non-draft week outright with 55000, so they could not
--      diverge a published week by succeeding. They did, however, read the
--      week status in one statement and write shifts in a later one, so a
--      publication committing in between left the week published with shifts
--      written after the snapshot.
--
-- Correction: the database becomes the authority. An AFTER row trigger on
-- `public.shifts` performs the draft transition inside the same transaction as
-- the shift write itself, so the two either commit together or roll back
-- together. Centralising the invariant at the table, rather than at each
-- caller, is what makes it total: it covers the direct server-function writes,
-- bulk paste/fill/clear (which reuse those same server functions),
-- `rpc_decline_open_shift_request`, the read-then-write window in every
-- draft-gated RPC above, and any future shift writer, with no application
-- changes and no possibility of a caller forgetting.
--
-- Lock protocol is unchanged. The phase 40 BEFORE trigger
-- (`shifts_00_lock_rota_week_for_write`) already takes `FOR UPDATE` on every
-- affected rota week before any shift row is written, so this AFTER trigger
-- updates a row the current transaction already holds. It acquires no new lock
-- and introduces no new acquisition order, and is therefore deadlock-free by
-- construction. The `90` name prefix keeps it sorted after every existing
-- BEFORE trigger on the table.
--
-- Publish is unaffected: no version of `rpc_publish_rota_week` writes
-- `public.shifts`, so this trigger cannot fire during publication and cannot
-- flip a freshly published week back to draft.
--
-- Only `published` transitions to `draft`. Already-draft weeks are untouched
-- (idempotent, and no redundant `updated_at` churn), and `archived` weeks are
-- deliberately excluded so an archival record can never be silently reopened
-- by a stray write.

create or replace function public.mark_rota_week_draft_for_shift_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected_week record;
begin
  -- An UPDATE may move a shift between weeks, so both the old and the new week
  -- must be reconciled. Ordering by (workspace_id, rota_week_id) matches the
  -- phase 40 lock trigger exactly, keeping the two triggers' row order
  -- identical even though this one re-locks nothing.
  for affected_week in
    select distinct candidate.workspace_id, candidate.rota_week_id
    from (
      values
        (case when tg_op <> 'INSERT' then old.workspace_id end,
         case when tg_op <> 'INSERT' then old.rota_week_id end),
        (case when tg_op <> 'DELETE' then new.workspace_id end,
         case when tg_op <> 'DELETE' then new.rota_week_id end)
    ) as candidate(workspace_id, rota_week_id)
    where candidate.workspace_id is not null
      and candidate.rota_week_id is not null
    order by candidate.workspace_id, candidate.rota_week_id
  loop
    update public.rota_weeks
    set status = 'draft'
    where workspace_id = affected_week.workspace_id
      and id = affected_week.rota_week_id
      and status = 'published';
  end loop;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.mark_rota_week_draft_for_shift_write()
  from public, anon, authenticated;

drop trigger if exists shifts_90_mark_rota_week_draft on public.shifts;
create trigger shifts_90_mark_rota_week_draft
after insert or update or delete on public.shifts
for each row execute function public.mark_rota_week_draft_for_shift_write();

comment on function public.mark_rota_week_draft_for_shift_write() is
  'Transactional unpublished-change authority. Any write to public.shifts marks its published rota week draft in the same transaction, so a shift change and the week draft transition can never diverge. Idempotent on draft weeks; archived weeks are never reopened.';
