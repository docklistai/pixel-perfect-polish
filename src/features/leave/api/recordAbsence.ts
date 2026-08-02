import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { toSafeBusinessMessage } from "@/lib/safe-errors";

/** Leave types a manager may record directly. Mirrors the RPC's own check. */
export const MANAGER_ABSENCE_TYPES = [
  "sick",
  "annual_leave",
  "personal",
  "unpaid",
  "other",
] as const;

export type ManagerAbsenceType = (typeof MANAGER_ABSENCE_TYPES)[number];

export const MANAGER_ABSENCE_TYPE_LABELS: Record<ManagerAbsenceType, string> = {
  sick: "Sickness",
  annual_leave: "Annual leave",
  personal: "Personal",
  unpaid: "Unpaid",
  other: "Other",
};

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD date.");

const recordAbsenceInput = z
  .object({
    workspaceId: z.string().uuid(),
    staffMemberId: z.string().uuid(),
    leaveType: z.enum(MANAGER_ABSENCE_TYPES),
    startDate: isoDate,
    endDate: isoDate,
    reason: z.string().trim().min(1, "Add a short reason.").max(2000),
  })
  .superRefine((input, context) => {
    if (input.endDate < input.startDate) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "The end date can't be before the start date.",
      });
    }
  });

export interface ConflictingShift {
  shift_id: string;
  rota_week_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  role_name: string;
  assignment_status: string;
}

export interface RecordedAbsence {
  leave_request_id: string;
  staff_member_id: string;
  staff_display_name: string;
  leave_type: ManagerAbsenceType;
  start_date: string;
  end_date: string;
  status: "approved";
  conflicting_shifts: ConflictingShift[];
}

export type RecordAbsenceResult =
  | { ok: true; absence: RecordedAbsence }
  | { ok: false; message: string };

/**
 * Records an already-approved absence for an active staff member.
 *
 * The RPC owns authorisation, the eligibility lock, overlap refusal, the single
 * audit event and the staff notification. Overlapping shifts come back in the
 * result for review — the RPC never edits or deletes them.
 */
export const recordAbsenceFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => recordAbsenceInput.parse(input))
  .handler(async ({ data }): Promise<RecordAbsenceResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const supabase = getSupabaseServerClient();
    const { data: result, error } = await supabase.rpc("rpc_manager_record_absence", {
      p_workspace_id: data.workspaceId,
      p_staff_member_id: data.staffMemberId,
      p_leave_type: data.leaveType,
      p_start_date: data.startDate,
      p_end_date: data.endDate,
      p_reason: data.reason,
    });

    if (!error) return { ok: true, absence: result as RecordedAbsence };

    const message =
      error.code === "42501"
        ? "You don't have manager access to record an absence."
        : toSafeBusinessMessage(error, "We couldn't record that absence. Please try again.");
    return { ok: false, message };
  });
