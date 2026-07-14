import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type ManagerOneOffUnavailability = {
  id: string;
  staffMemberId: string;
  date: string;
  status: "pending" | "approved" | "declined" | "withdrawn";
  note: string | null;
  decisionNote: string | null;
};

interface OneOffRow {
  id: string;
  staff_member_id: string;
  date: string;
  status: ManagerOneOffUnavailability["status"];
  note: string | null;
  decision_note: string | null;
}

export const fetchStaffOneOffUnavailabilityFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ requests: ManagerOneOffUnavailability[] }> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { data, error } = await supabase
      .from("staff_one_off_unavailability_requests")
      .select("id, staff_member_id, date, status, note, decision_note")
      .eq("workspace_id", workspaceId)
      .order("date", { ascending: false });
    if (error) throw error;
    return {
      requests: ((data as OneOffRow[] | null) ?? []).map((row) => ({
        id: row.id,
        staffMemberId: row.staff_member_id,
        date: row.date,
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

export type DecideOneOffUnavailabilityInput = z.infer<typeof decideSchema>;
export type OneOffDecisionResult = { ok: true } | { ok: false; message: string };

export const decideOneOffUnavailabilityFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decideSchema.parse(input))
  .handler(async ({ data }): Promise<OneOffDecisionResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);
    const { error } = await supabase.rpc("rpc_decide_one_off_unavailability", {
      p_workspace_id: workspaceId,
      p_request_id: data.requestId,
      p_status: data.status,
      p_note: data.note,
    });
    if (!error) return { ok: true };
    if (error.code === "P0002") return { ok: false, message: "That request no longer exists." };
    if (error.code === "55000") return { ok: false, message: error.message };
    return { ok: false, message: "We couldn't save the decision. Please try again." };
  });
