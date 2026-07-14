import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Staff-side portal write actions. Every write goes through a SECURITY DEFINER
 * RPC executed by a per-request server client bound to the caller's session
 * cookie — never a direct browser table write, never a service-role key. The
 * RPCs re-derive the caller's identity, role, and workspace from `auth.uid()`,
 * so a staff member can only ever act on their own records.
 */

export type SubmitLeaveResult = { ok: true } | { ok: false; message: string };

const submitLeaveSchema = z.object({
  workspaceId: z.string().uuid(),
  leaveType: z.enum(["annual_leave", "personal", "sick", "unpaid", "other"]),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().trim().min(1).max(2000),
});

function describeSubmitError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have staff access to submit leave for this workspace.";
    case "22023":
      return "Check the leave type, dates, and reason, then try again.";
    default:
      return "We couldn't submit your request. Please try again.";
  }
}

/**
 * Submits a pending leave request for the signed-in staff member via
 * `rpc_submit_leave_request`. The RPC writes the request, its submitted event,
 * the manager fan-out, and an audit record in one transaction.
 */
export const submitLeaveRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => submitLeaveSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_submit_leave_request", {
      p_workspace_id: data.workspaceId,
      p_leave_type: data.leaveType,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_reason: data.reason,
    });

    if (error) {
      return { ok: false, message: describeSubmitError(error.code ?? null) };
    }

    return { ok: true };
  });

const markReadSchema = z.object({ workspaceId: z.string().uuid() });

/**
 * Marks all of the signed-in staff member's own notification deliveries read.
 * This is a non-sensitive own-data write: the `notification_deliveries`
 * recipient-update RLS policy restricts the update to the caller's own
 * deliveries, so it can never touch another member's read state.
 */
export const markPortalNotificationsReadFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => markReadSchema.parse(input))
  .handler(async ({ data }): Promise<SubmitLeaveResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase
      .from("notification_deliveries")
      .update({ read_at: new Date().toISOString() })
      .eq("workspace_id", data.workspaceId)
      .is("read_at", null);

    if (error) {
      return { ok: false, message: "We couldn't update your notifications. Please try again." };
    }

    return { ok: true };
  });

export type ClockEventResult = { ok: true } | { ok: false; message: string };

const clockEventSchema = z.object({
  workspaceId: z.string().uuid(),
  eventType: z.enum(["clock_in", "clock_out", "break_start", "break_end"]),
  timeEntryId: z.string().uuid().nullable().optional(),
});

function describeClockError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "The staff clock is only available to staff-role members.";
    case "P0002":
      return "We couldn't find an open shift entry for that action.";
    case "55000":
    case "22023":
      return "That clock action isn't valid right now.";
    default:
      return "We couldn't record your clock action. Please try again.";
  }
}

/**
 * Records a clock-in / clock-out / break-start / break-end for the signed-in
 * staff member via `rpc_staff_clock_event`. The RPC opens a new entry on
 * clock-in and enforces break pairing on the open (or owned) entry; identity,
 * role, and workspace are re-derived server-side from the caller's session.
 */
export const staffClockEventFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => clockEventSchema.parse(input))
  .handler(async ({ data }): Promise<ClockEventResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_staff_clock_event", {
      p_workspace_id: data.workspaceId,
      p_event_type: data.eventType,
      p_time_entry_id: data.timeEntryId ?? null,
    });

    if (error) {
      return { ok: false, message: describeClockError(error.code ?? null) };
    }

    return { ok: true };
  });

export type OpenShiftActionResult = { ok: true } | { ok: false; message: string };

const requestOpenShiftSchema = z.object({
  workspaceId: z.string().uuid(),
  publishedShiftId: z.string().uuid(),
});

const withdrawOpenShiftSchema = z.object({
  workspaceId: z.string().uuid(),
  requestId: z.string().uuid(),
});

/**
 * The phase-27 RPCs raise state-specific reasons ("this rota has been
 * republished…", "this shift is in the past") that staff need verbatim;
 * anything else gets a neutral fallback.
 */
function describeOpenShiftError(sqlState: string | null, message: string | null): string {
  switch (sqlState) {
    case "42501":
      return "Only staff members can request open shifts.";
    case "P0002":
      return "That open shift is no longer on the published rota.";
    case "55000":
      return message ?? "That request isn't valid right now.";
    default:
      return "We couldn't update your request. Please try again.";
  }
}

/**
 * Requests a published open shift for the signed-in staff member via
 * `rpc_request_open_shift`. The RPC never changes any rota — it records a
 * pending request the manager decides on.
 */
export const requestOpenShiftFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestOpenShiftSchema.parse(input))
  .handler(async ({ data }): Promise<OpenShiftActionResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_request_open_shift", {
      p_workspace_id: data.workspaceId,
      p_published_shift_id: data.publishedShiftId,
    });

    if (error) {
      return {
        ok: false,
        message: describeOpenShiftError(error.code ?? null, error.message ?? null),
      };
    }
    return { ok: true };
  });

/** Withdraws the caller's own pending request via `rpc_withdraw_open_shift_request`. */
export const withdrawOpenShiftRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawOpenShiftSchema.parse(input))
  .handler(async ({ data }): Promise<OpenShiftActionResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();

    const { error } = await supabase.rpc("rpc_withdraw_open_shift_request", {
      p_workspace_id: data.workspaceId,
      p_request_id: data.requestId,
    });

    if (error) {
      return {
        ok: false,
        message: describeOpenShiftError(error.code ?? null, error.message ?? null),
      };
    }
    return { ok: true };
  });
