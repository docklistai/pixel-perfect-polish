import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { adjustTimeEntryFn, batchApproveTimeFn } from "../api/timeLiveData";
import { flagTimeEntryFn, unflagTimeEntryFn } from "../api/flagTimeEntry";
import {
  approvalEligibility,
  describeBulkApproval,
  isApprovable,
  partitionForApproval,
  REASON_LABEL,
} from "../lib/approvalEligibility";
import { prepareAdjustment } from "../lib/liveAdjustment";
import { runTimeWrite } from "../lib/timeWriteFeedback";
import { useTimeActions } from "./useTimeActions";
import { timeQueryKeys } from "../lib/timeQueryRange";
import type { StoredTimesheetRow, TimeAdjustment } from "../types";

const timeRouteApi = getRouteApi("/time");

export function useTimeController(
  allRows: StoredTimesheetRow[],
  scopedRows: StoredTimesheetRow[],
  source: "live" | "demo",
) {
  const { auth } = timeRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const demo = useTimeActions(allRows, scopedRows);
  const [submitting, setSubmitting] = React.useState(false);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const isLive = source === "live" && Boolean(getSupabaseEnv()) && Boolean(workspaceId);

  if (!isLive) return demo;

  const runApprove = async (
    ids: string[],
    status: "approved" | "rejected" | "pending",
    successTitle: string,
    successDescription: string,
    reason?: string,
  ) => {
    if (ids.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const result = await runTimeWrite(
        () =>
          batchApproveTimeFn({
            data: {
              workspaceId: workspaceId!,
              timeEntryIds: ids,
              approvalStatus: status,
              reason: reason?.trim() || undefined,
            },
          }),
        "Couldn't update timesheets",
      );
      if (!result) return;
      if (!result.ok) {
        toast.error("Couldn't update timesheets", { description: result.message });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: timeQueryKeys.root });
      toast.success(successTitle, { description: successDescription });
    } finally {
      setSubmitting(false);
    }
  };

  const approveEligible = (rows: StoredTimesheetRow[], successTitle: string) => {
    const { eligible, excluded } = partitionForApproval(rows);
    const outcome = describeBulkApproval(eligible, excluded);
    if (outcome.empty) {
      toast.info("Nothing approved", { description: outcome.description });
      return;
    }
    void runApprove(
      eligible.map((row) => row.id),
      "approved",
      successTitle,
      outcome.description,
    );
  };

  const runFlag = async (row: StoredTimesheetRow, note: string) => {
    if (submitting) return;
    if (!note.trim()) {
      toast.error("Note required", { description: "A note is required when flagging for review." });
      return;
    }
    setSubmitting(true);
    try {
      const result = await runTimeWrite(
        () =>
          flagTimeEntryFn({
            data: {
              workspaceId: workspaceId!,
              timeEntryId: row.id,
              note: note.trim(),
            },
          }),
        "Couldn't flag timesheet",
      );
      if (!result) return;
      if (!result.ok) {
        toast.error("Couldn't flag timesheet", { description: result.message });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: timeQueryKeys.root });
      toast.warning("Flagged for review", {
        description: `${row.n}'s entry flagged for review.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runUnflag = async (row: StoredTimesheetRow) => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const result = await runTimeWrite(
        () =>
          unflagTimeEntryFn({
            data: {
              workspaceId: workspaceId!,
              timeEntryId: row.id,
            },
          }),
        "Couldn't clear flag",
      );
      if (!result) return;
      if (!result.ok) {
        toast.error("Couldn't clear flag", { description: result.message });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: timeQueryKeys.root });
      toast.info("Flag removed", {
        description: `${row.n}'s entry unflagged.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const runBulkFlag = async (ids: string[], note: string) => {
    if (ids.length === 0 || submitting) return;
    if (!note.trim()) {
      toast.error("Note required", { description: "A note is required when flagging for review." });
      return;
    }
    setSubmitting(true);
    try {
      for (const id of ids) {
        await flagTimeEntryFn({
          data: {
            workspaceId: workspaceId!,
            timeEntryId: id,
            note: note.trim(),
          },
        });
      }
      await queryClient.invalidateQueries({ queryKey: timeQueryKeys.root });
      toast.warning("Flagged for review", {
        description: `${ids.length} timesheet${ids.length === 1 ? "" : "s"} flagged for review.`,
      });
      demo.clearSelection();
    } catch {
      toast.error("Couldn't flag selected timesheets");
    } finally {
      setSubmitting(false);
    }
  };

  const saveAdjustment = async (row: StoredTimesheetRow, adjustment: TimeAdjustment) => {
    const prepared = prepareAdjustment(row, adjustment);
    if (!prepared.ok) {
      toast.error("Can't save adjustment", { description: prepared.message });
      return;
    }
    const result = await runTimeWrite(
      () =>
        adjustTimeEntryFn({
          data: { workspaceId: workspaceId!, timeEntryId: row.id, ...prepared.payload },
        }),
      "Couldn't save adjustment",
    );
    if (!result) return;
    if (!result.ok) {
      toast.error("Couldn't save adjustment", { description: result.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: timeQueryKeys.root });
    toast.success("Adjustment saved", {
      description: `${row.n}'s timesheet was updated and reset to pending.`,
    });
  };

  const blockIneligible = (row: StoredTimesheetRow, resolutionNote = ""): boolean => {
    const reason = approvalEligibility(row, true, Boolean(resolutionNote.trim()));
    if (reason === "ok") return false;
    toast.error("Can't approve this entry", { description: `It is ${REASON_LABEL[reason]}.` });
    return true;
  };

  const setApproval = (row: StoredTimesheetRow) => {
    const next = row.status === "approved" ? "pending" : "approved";
    if (next === "approved" && blockIneligible(row)) return;
    void runApprove(
      [row.id],
      next,
      next === "approved" ? "Approved" : "Reverted",
      next === "approved"
        ? `${row.n}'s entry is ready to export as approved hours.`
        : `${row.n}'s approval reverted to pending.`,
    );
  };

  const rowsByIds = (ids: string[]) => {
    const wanted = new Set(ids);
    return allRows.filter((row) => wanted.has(row.id));
  };

  return {
    ...demo,
    isSubmitting: submitting,
    isApprovable: (row: StoredTimesheetRow) => isApprovable(row),
    toggleApprove: setApproval,
    revert: setApproval,
    approve: (row: StoredTimesheetRow, note = "") => {
      if (row.status === "approved" || blockIneligible(row, note)) return;
      void runApprove(
        [row.id],
        "approved",
        "Approved",
        `${row.n}'s entry is ready to export.`,
        note,
      );
    },
    reject: (row: StoredTimesheetRow, reason = "") => {
      if (row.status === "unapproved") return;
      if (!reason.trim()) {
        toast.error("Reason required", {
          description: "A note explaining what needs correcting is required.",
        });
        return;
      }
      void runApprove(
        [row.id],
        "rejected",
        "Returned for correction",
        `${row.n}'s entry was returned and is no longer pending approval.`,
        reason.trim(),
      );
    },
    bulkApprove: (ids: string[], label: string) => approveEligible(rowsByIds(ids), label),
    approveSelection: () => {
      approveEligible(rowsByIds([...demo.selectedIds]), "Timesheets approved");
      demo.clearSelection();
    },
    approveAllPending: () =>
      approveEligible(
        scopedRows.filter((row) => row.status === "pending"),
        "Bulk approved",
      ),
    saveAdjustment: (row: StoredTimesheetRow, adjustment: TimeAdjustment) =>
      void saveAdjustment(row, adjustment),
    toggleFlag: (row: StoredTimesheetRow, note?: string) => {
      if (row.flagged) {
        void runUnflag(row);
      } else {
        void runFlag(row, note || "Flagged for review");
      }
    },
    flagSelection: (note?: string) => {
      const ids = [...demo.selectedIds];
      void runBulkFlag(ids, note || "Bulk flagged for review");
    },
  };
}
