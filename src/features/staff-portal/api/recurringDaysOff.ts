import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseBrowserClient } from "@/lib/supabase/browserClient";
import type { RecurringDayOff } from "../lib/recurringDaysOff";

/**
 * Staff-side recurring day-off requests. Reads hit the staff-safe
 * `staff_portal_recurring_days_off` view (the caller's own rows only). Writes
 * go through SECURITY DEFINER RPCs via a session-bound server client — never a
 * direct browser table write — so a staff member can only ever act on their
 * own standing requests.
 */

interface RecurringDayOffViewRow {
  request_id: string;
  weekday: number;
  status: "pending" | "approved" | "declined";
  note: string | null;
  decision_note: string | null;
}

export async function fetchPortalRecurringDaysOff(workspaceId: string): Promise<RecurringDayOff[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("staff_portal_recurring_days_off")
    .select("request_id, weekday, status, note, decision_note")
    .eq("workspace_id", workspaceId)
    .order("weekday", { ascending: true });

  if (error) throw error;

  return ((data as RecurringDayOffViewRow[] | null) ?? []).map((row) => ({
    requestId: row.request_id,
    weekday: row.weekday,
    status: row.status,
    note: row.note,
    decisionNote: row.decision_note,
  }));
}

export type RecurringDayOffWriteResult = { ok: true } | { ok: false; message: string };

function describeWriteError(sqlState: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have staff access to manage day-off requests here.";
    case "22023":
      return "Check the day you picked, then try again.";
    case "P0002":
      return "There's no request for that day to withdraw.";
    default:
      return "We couldn't save your request. Please try again.";
  }
}

const requestSchema = z.object({
  workspaceId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
  note: z.string().trim().max(500).nullable(),
});

export const requestRecurringDayOffFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data }): Promise<RecurringDayOffWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_request_recurring_day_off", {
      p_workspace_id: data.workspaceId,
      p_weekday: data.weekday,
      p_note: data.note,
    });
    if (error) return { ok: false, message: describeWriteError(error.code ?? null) };
    return { ok: true };
  });

const withdrawSchema = z.object({
  workspaceId: z.string().uuid(),
  weekday: z.number().int().min(0).max(6),
});

export const withdrawRecurringDayOffFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawSchema.parse(input))
  .handler(async ({ data }): Promise<RecurringDayOffWriteResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.rpc("rpc_withdraw_recurring_day_off", {
      p_workspace_id: data.workspaceId,
      p_weekday: data.weekday,
    });
    if (error) return { ok: false, message: describeWriteError(error.code ?? null) };
    return { ok: true };
  });
