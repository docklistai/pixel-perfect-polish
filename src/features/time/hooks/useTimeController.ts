import { useQueryClient } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { toast } from "sonner";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { batchApproveTimeFn } from "../api/timeLiveData";
import { useTimeActions } from "./useTimeActions";
import { TIME_QUERY_KEY } from "./useWorkspaceTime";
import type { StoredTimesheetRow } from "../types";

const timeRouteApi = getRouteApi("/time");

/**
 * Time-page actions. Reuses {@link useTimeActions} for client selection state
 * and the demo path, and — when the page is showing live data — overrides the
 * persisted approval actions to route through `rpc_batch_approve_time_entries`.
 *
 * Adjustments and flagging have no usable live path: the adjust dialog yields
 * clock times without a date (so the timestamptz the adjust RPC requires can't
 * be built from the rendered row), and there is no flag column or RPC. In live
 * mode they are surfaced as "not available yet" rather than silently mutating
 * the unused demo store and showing a false success.
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
    // No live primitive for these — do not mutate the demo store or fake success.
    saveAdjustment: notLiveYet,
    toggleFlag: notLiveYet,
    flagSelection: notLiveYet,
  };
}
