import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side recurring day-off requests. Reads are RLS-scoped to the active
 * manager workspace; decisions go through the `rpc_decide_recurring_day_off`
 * SECURITY DEFINER RPC, which records the decider and notifies the staff member.
 */

export type ManagerRecurringDayOff = {
  id: string;
  staffMemberId: string;
  /** 0 = Monday .. 6 = Sunday. */
  weekday: number;
  status: "pending" | "approved" | "declined";
  note: string | null;
  decisionNote: string | null;
};

interface RecurringDayOffRow {
  id: string;
  staff_member_id: string;
  weekday: number;
  status: "pending" | "approved" | "declined";
  note: string | null;
  decision_note: string | null;
}

export const fetchStaffRecurringDaysOffFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ requests: ManagerRecurringDayOff[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { data, error } = await supabase
      .from("staff_recurring_day_off_requests")
      .select("id, staff_member_id, weekday, status, note, decision_note")
      .eq("workspace_id", workspaceId)
      .order("weekday", { ascending: true });
    if (error) throw error;

    return {
      requests: ((data as RecurringDayOffRow[] | null) ?? []).map((row) => ({
        id: row.id,
        staffMemberId: row.staff_member_id,
        weekday: row.weekday,
        status: row.status,
        note: row.note,
        decisionNote: row.decision_note,
      })),
    };
  },
);

const decideSchema = z.object({
  requestId: z.string().uuid(),
  status: z.enum(["approved", "declined", "pending"]),
  note: z.string().trim().max(500).nullable(),
});

export type DecideRecurringDayOffInput = z.infer<typeof decideSchema>;

export const decideRecurringDayOffFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decideSchema.parse(input))
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase.rpc("rpc_decide_recurring_day_off", {
      p_workspace_id: workspaceId,
      p_request_id: data.requestId,
      p_status: data.status,
      p_note: data.note,
    });
    if (error) {
      const message =
        error.code === "55000"
          ? "That request has already been decided."
          : "We couldn't save the decision. Please try again.";
      return { ok: false, message };
    }
    return { ok: true };
  });
