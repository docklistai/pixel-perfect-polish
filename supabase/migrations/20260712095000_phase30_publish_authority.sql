-- Phase 30: one authoritative publication transition.
--
-- Phase 3 granted managers direct INSERT on published_rota_snapshots,
-- published_rota_shifts, notifications, and notification_deliveries. The
-- phase 4 guards kept direct inserts structurally honest (same-transaction,
-- sequential versions, unforgeable actor), but a manager-authorised SQL caller
-- could still mint a snapshot + shifts in one hand-rolled transaction and skip
-- everything rpc_publish_rota_week owns since phases 28/29: open-shift request
-- finalisation, preflight-validated selections, targeted notifications, and
-- the publish audit record. The same grants let a manager fabricate
-- "Rota published" / "Open shift confirmed" notifications no publication ever
-- produced.
--
-- From this phase the SECURITY DEFINER RPCs are the only client-reachable
-- writers of publication evidence:
--   * rpc_publish_rota_week      — snapshots, published shifts, finalisation,
--                                  notifications, audit (one transaction).
--   * rpc_internal_notify        — every notification + delivery fan-out.
-- Client roles keep read access only. The service/seed path (no auth.uid())
-- is unaffected: seeds and tests running as postgres write directly, and the
-- phase 4 guard triggers remain as defence in depth on every insert path.

-- ---------------------------------------------------------------------------
-- 1. Published rota evidence: revoke client writes.
-- ---------------------------------------------------------------------------

revoke insert on table public.published_rota_snapshots from authenticated;
revoke insert on table public.published_rota_shifts from authenticated;

drop policy if exists published_rota_snapshots_manager_insert on public.published_rota_snapshots;
drop policy if exists published_rota_shifts_manager_insert on public.published_rota_shifts;

comment on table public.published_rota_snapshots is
  'Immutable publication versions. Written only by rpc_publish_rota_week (and the trusted seed/service path); clients read, never write.';
comment on table public.published_rota_shifts is
  'Immutable published shift rows per snapshot. Written only by rpc_publish_rota_week (and the trusted seed/service path); clients read, never write.';

-- ---------------------------------------------------------------------------
-- 2. Notifications: revoke client writes; reads are unchanged.
--    Staff keep their recipient-scoped read_at/delivered_at update (mark-read).
-- ---------------------------------------------------------------------------

revoke insert on table public.notifications from authenticated;
revoke insert on table public.notification_deliveries from authenticated;

drop policy if exists notifications_manager_insert on public.notifications;
drop policy if exists notification_deliveries_manager_all on public.notification_deliveries;

-- Managers could read every delivery under the dropped FOR ALL policy; keep
-- exactly the read half so no existing read path changes.
create policy notification_deliveries_manager_select
on public.notification_deliveries for select to authenticated
using (public.has_workspace_role(workspace_id, array['owner', 'manager']));

comment on table public.notifications is
  'In-app notifications. Written only by rpc_internal_notify inside the owning RPC transaction; clients read, never write.';
comment on table public.notification_deliveries is
  'Per-recipient notification state. Created only by rpc_internal_notify; recipients may update their own delivered_at/read_at.';

notify pgrst, 'reload schema';
