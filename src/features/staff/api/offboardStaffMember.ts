import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const offboardInput = z.object({
  staffMemberId: z.string().uuid(),
  reason: z.string().trim().min(1).max(500),
});

export interface OffboardFutureAssignment {
  shiftDate: string;
  startsAt: string;
  endsAt: string;
  roleName: string;
}

export type OffboardStaffMemberResult =
  | {
      ok: true;
      alreadyOffboarded: boolean;
      membershipRevoked: boolean;
      accessCodesRevoked: number;
      recoveryCodesRevoked: number;
      futureDraftAssignments: OffboardFutureAssignment[];
      futurePublishedAssignments: OffboardFutureAssignment[];
    }
  | { ok: false; message: string };

type RpcAssignment = {
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
};

function toAssignments(value: unknown): OffboardFutureAssignment[] {
  return ((value as RpcAssignment[] | null) ?? []).map((row) => ({
    shiftDate: row.shift_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    roleName: row.role_name,
  }));
}

function describeOffboardError(code: string | null | undefined): string {
  switch (code) {
    case "42501":
      return "You don't have manager access for this action.";
    case "P0002":
      return "That staff member isn't part of this workspace.";
    case "22023":
      return "Add a short reason for the offboarding.";
    default:
      return "The offboarding could not be completed. Nothing was changed — please try again.";
  }
}

/**
 * Transactional staff offboarding via `rpc_offboard_staff_member`: marks the
 * record left, revokes portal membership and outstanding codes, retains all
 * history, and returns the future draft/published assignments that now need
 * manager action. Atomic — a failure changes nothing.
 */
export const offboardStaffMemberFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => offboardInput.parse(input))
  .handler(async ({ data }): Promise<OffboardStaffMemberResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { requireActiveManagerWorkspaceId } =
      await import("@/features/auth/api/activeManagerWorkspace");
    const supabase = getSupabaseServerClient();

    let workspaceId: string;
    try {
      workspaceId = await requireActiveManagerWorkspaceId(supabase);
    } catch {
      return { ok: false, message: describeOffboardError("42501") };
    }

    const { data: result, error } = await supabase.rpc("rpc_offboard_staff_member", {
      p_workspace_id: workspaceId,
      p_staff_member_id: data.staffMemberId,
      p_reason: data.reason,
    });

    if (error) {
      return { ok: false, message: describeOffboardError(error.code ?? null) };
    }

    const payload = result as {
      already_offboarded: boolean;
      membership_revoked: boolean;
      access_codes_revoked: number;
      recovery_codes_revoked: number;
      future_draft_assignments: unknown;
      future_published_assignments: unknown;
    };

    return {
      ok: true,
      alreadyOffboarded: payload.already_offboarded,
      membershipRevoked: payload.membership_revoked,
      accessCodesRevoked: payload.access_codes_revoked,
      recoveryCodesRevoked: payload.recovery_codes_revoked,
      futureDraftAssignments: toAssignments(payload.future_draft_assignments),
      futurePublishedAssignments: toAssignments(payload.future_published_assignments),
    };
  });
