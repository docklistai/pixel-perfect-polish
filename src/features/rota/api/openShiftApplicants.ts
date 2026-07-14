import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Manager-side open-shift applicant reads and decisions. Reads run under the
 * manager RLS select policy on `open_shift_requests`; decisions go through the
 * phase-27 SECURITY DEFINER RPCs, which revalidate the applicant (employment,
 * role, leave, days off, overlaps, weekly hours) and only ever touch the DRAFT
 * shift — the published snapshot changes at republish.
 */

export type ApplicantStatus = "pending" | "selected";

export interface OpenShiftApplicant {
  requestId: string;
  sourceShiftId: string;
  staffMemberId: string;
  staffName: string;
  staffRole: string;
  status: ApplicantStatus;
  requestedAt: string;
}

const applicantsInput = z.object({ rotaWeekId: z.string().uuid() });

const decisionInput = z.object({ requestId: z.string().uuid() });

const declineInput = z.object({
  requestId: z.string().uuid(),
  reason: z.string().trim().max(2000).optional(),
});

export type ApplicantDecisionResult = { ok: true } | { ok: false; message: string };

/**
 * The phase-27 RPCs raise revalidation reasons the manager needs verbatim
 * ("the applicant has approved leave on that day", "the published rota
 * changed after this request…"); anything else gets a neutral fallback.
 */
function describeDecisionError(sqlState: string | null, message: string | null): string {
  switch (sqlState) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "This request no longer exists in the workspace.";
    case "55000":
      return message ?? "That decision isn't valid for the current request state.";
    default:
      return "We couldn't apply the decision. Please try again.";
  }
}

interface RequestRow {
  id: string;
  source_shift_id: string;
  staff_member_id: string;
  status: ApplicantStatus;
  created_at: string;
}

/** Live pending/selected applicants for one rota week, oldest request first. */
export const fetchOpenShiftApplicantsFn = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => applicantsInput.parse(input))
  .handler(async ({ data }): Promise<OpenShiftApplicant[]> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const [{ data: requests, error: requestsError }, { data: staff, error: staffError }] =
      await Promise.all([
        supabase
          .from("open_shift_requests")
          .select("id, source_shift_id, staff_member_id, status, created_at")
          .eq("workspace_id", workspaceId)
          .eq("rota_week_id", data.rotaWeekId)
          .in("status", ["pending", "selected"])
          .order("created_at", { ascending: true }),
        supabase
          .from("staff_members")
          .select("id, display_name, role_name")
          .eq("workspace_id", workspaceId),
      ]);

    if (requestsError) throw requestsError;
    if (staffError) throw staffError;

    const staffById = new Map(
      ((staff as { id: string; display_name: string; role_name: string }[] | null) ?? []).map(
        (row) => [row.id, row],
      ),
    );

    return ((requests as RequestRow[] | null) ?? []).map((row) => ({
      requestId: row.id,
      sourceShiftId: row.source_shift_id,
      staffMemberId: row.staff_member_id,
      staffName: staffById.get(row.staff_member_id)?.display_name ?? "Team member",
      staffRole: staffById.get(row.staff_member_id)?.role_name ?? "—",
      status: row.status,
      requestedAt: row.created_at,
    }));
  });

/**
 * Selects one applicant via `rpc_select_open_shift_applicant`: revalidates the
 * applicant and assigns the DRAFT shift. The published rota is untouched until
 * the manager republishes.
 */
export const selectOpenShiftApplicantFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => decisionInput.parse(input))
  .handler(async ({ data }): Promise<ApplicantDecisionResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase.rpc("rpc_select_open_shift_applicant", {
      p_workspace_id: workspaceId,
      p_request_id: data.requestId,
    });

    if (error) {
      return {
        ok: false,
        message: describeDecisionError(error.code ?? null, error.message ?? null),
      };
    }
    return { ok: true };
  });

/** Declines a pending (or undoes a selected) request via `rpc_decline_open_shift_request`. */
export const declineOpenShiftRequestFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => declineInput.parse(input))
  .handler(async ({ data }): Promise<ApplicantDecisionResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();
    const workspaceId = await requireActiveManagerWorkspaceId(supabase);

    const { error } = await supabase.rpc("rpc_decline_open_shift_request", {
      p_workspace_id: workspaceId,
      p_request_id: data.requestId,
      p_reason: data.reason ?? null,
    });

    if (error) {
      return {
        ok: false,
        message: describeDecisionError(error.code ?? null, error.message ?? null),
      };
    }
    return { ok: true };
  });
