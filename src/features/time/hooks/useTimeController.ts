import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { adjustTimeEntryFn, batchApproveTimeFn } from "../api/timeLiveData";
import { parseBreakMinutes, parseClockField, workspaceWallTimeToIso } from "../lib/adjustTime";
import { useTimeActions } from "./useTimeActions";
import { TIME_QUERY_KEY } from "./useWorkspaceTime";
import type { StoredTimesheetRow, TimeAdjustment } from "../types";

const timeRouteApi = getRouteApi("/time");

/**
 * Time-page actions. Reuses {@link useTimeActions} for client selection state
 * and the demo path, and — when the page is showing live data — overrides the
 * persisted approval actions to route through `rpc_batch_approve_time_entries`.
 *
 * Adjustments route through `rpc_adjust_time_entry`: the live row carries its
 * `workDate`, so the dialog's wall-clock fields resolve to exact timestamptz
 * values in the workspace timezone. A row without that date context is blocked
 * with a clear message rather than faking success. Flagging still has no flag
 * column or RPC, so it stays "not available yet" in live mode.
 */
export function useTimeController(
  allRows: StoredTimesheetRow[],
  scopedRows: StoredTimesheetRow[],
  source: "live" | "demo",
) {
  const { auth } = timeRouteApi.useRouteContext();
  const queryClient = useQueryClient();
  const demo = useTimeActions(allRows, scopedRows);

  const workspaceId = auth.status === "member" ? auth.workspaceId : null;
  const isLive = source === "live" && Boolean(getSupabaseEnv()) && Boolean(workspaceId);

  if (!isLive) return demo;

  const runApprove = async (
    ids: string[],
    status: "approved" | "rejected" | "pending",
    successTitle: string,
    successDescription: string,
  ) => {
    if (ids.length === 0) return;
    const result = await batchApproveTimeFn({
      data: { workspaceId: workspaceId!, timeEntryIds: ids, approvalStatus: status },
    });
    if (!result.ok) {
      toast.error("Couldn't update timesheets", { description: result.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["time", TIME_QUERY_KEY, workspaceId] });
    toast.success(successTitle, { description: successDescription });
  };

  const notLiveYet = () =>
    toast.info("Not available in live mode yet", {
      description: "This action isn't wired to the live workspace yet.",
    });

  const saveAdjustment = async (row: StoredTimesheetRow, adjustment: TimeAdjustment) => {
    if (!row.workDate) {
      toast.error("Can't adjust this entry", {
        description: "This timesheet is missing the date needed to set exact clock times.",
      });
      return;
    }

    const inField = parseClockField(adjustment.clockIn);
    const outField = parseClockField(adjustment.clockOut);
    const inBlank = adjustment.clockIn.trim() === "" || adjustment.clockIn.trim() === "—";
    const outBlank = adjustment.clockOut.trim() === "" || adjustment.clockOut.trim() === "—";
    const breakMinutes = parseBreakMinutes(adjustment.breakTime);

    if ((!inBlank && inField === null) || (!outBlank && outField === null)) {
      toast.error("Check the clock times", { description: "Enter times as HH:MM." });
      return;
    }
    if (breakMinutes === null) {
      toast.error("Check the break length", { description: "Enter the break as H:MM." });
      return;
    }
    if (outField !== null && inField === null) {
      toast.error("Clock-out needs a clock-in", {
        description: "Add a clock-in time before setting a clock-out.",
      });
      return;
    }

    const clockedInAt = inField
      ? workspaceWallTimeToIso(row.workDate, inField.hours, inField.minutes)
      : null;
    const clockedOutAt = outField
      ? workspaceWallTimeToIso(row.workDate, outField.hours, outField.minutes)
      : null;
    const reason = adjustment.note.trim()
      ? `${adjustment.reason} — ${adjustment.note.trim()}`
      : adjustment.reason;

    const result = await adjustTimeEntryFn({
      data: {
        workspaceId: workspaceId!,
        timeEntryId: row.id,
        clockedInAt,
        clockedOutAt,
        breakMinutes,
        reason,
      },
    });
    if (!result.ok) {
      toast.error("Couldn't save adjustment", { description: result.message });
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["time", TIME_QUERY_KEY, workspaceId] });
    toast.success("Adjustment saved", {
      description: `${row.n}'s timesheet was updated and reset to pending.`,
    });
  };

  const setApproval = (row: StoredTimesheetRow) => {
    const next = row.status === "approved" ? "pending" : "approved";
    void runApprove(
      [row.id],
      next,
      next === "approved" ? "Approved" : "Reverted",
      next === "approved"
        ? `${row.n}'s entry is ready to export as approved hours.`
        : `${row.n}'s approval reverted to pending.`,
    );
  };

  return {
    ...demo,
    toggleApprove: setApproval,
    revert: setApproval,
    approve: (row: StoredTimesheetRow) => {
      if (row.status === "approved") return;
      void runApprove([row.id], "approved", "Approved", `${row.n}'s entry is ready to export.`);
    },
    bulkApprove: (ids: string[], label: string) =>
      void runApprove(ids, "approved", label, `${ids.length} timesheet(s) approved.`),
    approveSelection: () => {
      void runApprove(
        [...demo.selectedIds],
        "approved",
        "Timesheets approved",
        `${demo.selectedIds.size} timesheet(s) approved.`,
      );
      demo.clearSelection();
    },
    approveAllPending: () =>
      void runApprove(
        scopedRows.filter((row) => row.status === "pending").map((row) => row.id),
        "approved",
        "Bulk approved",
        "All pending timesheets approved.",
      ),
    saveAdjustment: (row: StoredTimesheetRow, adjustment: TimeAdjustment) =>
      void saveAdjustment(row, adjustment),
    // Flagging has no flag column or RPC — do not fake success.
    toggleFlag: notLiveYet,
    flagSelection: notLiveYet,
  };
}
