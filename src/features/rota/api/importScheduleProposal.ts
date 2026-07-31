import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  importHeadedSchedule,
  type HeadedScheduleImportResult,
} from "@/features/scheduling/parsing/headedScheduleImport";
import { buildShiftSignature, signatureKey } from "../lib/scheduling/shiftSignature";
import { PLANNER_RULE_VERSION, type ProposalOperation } from "../lib/scheduling/buildWeekProposal";
import { addIsoDays, formatTimeInTimezone } from "../lib/liveRotaDates";
import type { BuildWeekApplySource } from "./buildWeekApplySource";

/**
 * Turns a pasted headed schedule into a reviewable proposal.
 *
 * Deliberately produces the **same operation list** Build the Week produces, so
 * an import is applied by the same atomic RPC, validated the same way, and
 * audited the same way. A second write path would be a second set of rules to
 * keep in step; there is only one.
 *
 * Read-only. Nothing here writes, and every source row comes back in the preview
 * whether or not it can be imported.
 */

const inputSchema = z.object({
  weekOffset: z.number().int().min(-260).max(260),
  locationId: z.string().uuid().optional(),
  text: z.string().min(1).max(200_000),
  dateOrder: z.enum(["iso", "day-first", "month-first"]),
});

export type ImportScheduleResult =
  | {
      ok: true;
      rotaWeekId: string;
      inputFingerprint: string;
      proposalDigest: string;
      /** Echoed back to apply unchanged; the fingerprint covers it. */
      applySource: BuildWeekApplySource;
      operations: ProposalOperation[];
      preview: HeadedScheduleImportResult;
    }
  | { ok: false; message: string; preview?: HeadedScheduleImportResult };

interface ShiftRow {
  id: string;
  staff_member_id: string | null;
  department_id: string;
  location_id: string;
  shift_date: string;
  starts_at: string;
  ends_at: string;
  break_minutes: number;
  role_name: string;
}

export const importScheduleProposalFn = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ImportScheduleResult> => {
    const { getSupabaseServerClient } = await import("@/lib/supabase/serverClient");
    const { getLiveContext } = await import("./rotaLiveMutationContext");
    const supabase = getSupabaseServerClient();

    const context = await getLiveContext(
      { weekOffset: data.weekOffset, ...(data.locationId ? { locationId: data.locationId } : {}) },
      { createWeek: false },
    );
    if (!context.week) {
      return { ok: false, message: "Open a saved draft week before importing into it." };
    }
    if (context.week.status !== "draft") {
      return { ok: false, message: "Schedules can only be imported into a draft week." };
    }

    const timezone = context.location.timezone;
    const weekIsoDates = Array.from({ length: 7 }, (_, index) =>
      addIsoDays(context.weekStart, index),
    );

    const [shiftsRes, staffRes, deptRes] = await Promise.all([
      supabase
        .from("shifts")
        .select(
          "id, staff_member_id, department_id, location_id, shift_date, starts_at, ends_at, break_minutes, role_name",
        )
        .eq("workspace_id", context.workspaceId)
        .eq("rota_week_id", context.week.id),
      supabase
        .from("staff_members")
        .select("id, display_name, employment_status")
        .eq("workspace_id", context.workspaceId),
      supabase
        .from("departments")
        .select("id, name, status")
        .eq("workspace_id", context.workspaceId),
    ]);
    if (shiftsRes.error) throw shiftsRes.error;
    if (staffRes.error) throw staffRes.error;
    if (deptRes.error) throw deptRes.error;

    const departments = (
      (deptRes.data as { id: string; name: string; status: string }[] | null) ?? []
    ).map((row) => ({ id: row.id, name: row.name, active: row.status === "active" }));
    const defaultDepartment = departments.find((department) => department.active);
    if (!defaultDepartment) {
      return { ok: false, message: "Add a department to this workspace before importing shifts." };
    }

    const existingSignatureKeys = new Set(
      ((shiftsRes.data as ShiftRow[] | null) ?? []).map((row) =>
        signatureKey(
          buildShiftSignature({
            workDate: row.shift_date,
            start: formatTimeInTimezone(row.starts_at, timezone),
            end: formatTimeInTimezone(row.ends_at, timezone),
            role: row.role_name,
            departmentId: row.department_id,
            locationId: row.location_id,
            breakMinutes: row.break_minutes,
          }),
        ),
      ),
    );

    const preview = importHeadedSchedule(data.text, {
      dateOrder: data.dateOrder,
      weekIsoDates,
      locationId: context.location.id,
      staff: (
        (staffRes.data as
          | { id: string; display_name: string; employment_status: string }[]
          | null) ?? []
      ).map((row) => ({
        id: row.id,
        name: row.display_name,
        active: row.employment_status === "active",
      })),
      departments,
      defaultDepartmentId: defaultDepartment.id,
      existingSignatureKeys,
    });

    if (!preview.ok) {
      return {
        ok: false,
        message: preview.diagnostics[0]?.message ?? "Nothing in that paste could be imported.",
        preview,
      };
    }

    // Imported rows become the same operation kinds Build produces, ordered by
    // ascending staff id so the apply stays inside the database lock protocol.
    const operations: ProposalOperation[] = preview.rows
      .filter((row) => row.ok && row.shift)
      .map((row) =>
        row.shift!.staffId === null
          ? {
              kind: "create-open" as const,
              signature: row.shift!.signature,
              roleName: row.shift!.roleName,
              reason: `Imported from row ${row.row}`,
            }
          : {
              kind: "create-assigned" as const,
              signature: row.shift!.signature,
              roleName: row.shift!.roleName,
              staffId: row.shift!.staffId,
              reason: `Imported from row ${row.row}`,
            },
      )
      .sort((a, b) => {
        const staffA = a.kind === "create-assigned" ? a.staffId : "";
        const staffB = b.kind === "create-assigned" ? b.staffId : "";
        if (staffA !== staffB) return staffA < staffB ? -1 : 1;
        return signatureKey(a.signature) < signatureKey(b.signature) ? -1 : 1;
      });

    const applySource: BuildWeekApplySource = {
      kind: "headed-import",
      id: null,
      contentVersion: `rows:${operations.length}`,
      plannerRuleVersion: PLANNER_RULE_VERSION,
    };
    // Same manager-guarded stamp Build uses; the internals stay revoked.
    const { data: stamp, error: stampError } = await supabase.rpc("rpc_build_week_proposal_stamp", {
      p_workspace_id: context.workspaceId,
      p_rota_week_id: context.week.id,
      p_source: applySource,
      p_operations: operations,
    });
    if (stampError) throw stampError;
    const { fingerprint, digest } = stamp as { fingerprint: string; digest: string };

    return {
      ok: true,
      rotaWeekId: context.week.id,
      inputFingerprint: fingerprint,
      proposalDigest: digest,
      applySource,
      operations,
      preview,
    };
  });
