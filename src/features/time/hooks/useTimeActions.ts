import * as React from "react";
import { toast } from "sonner";
import {
  adjustTimesheet,
  setTimesheetFlagged,
  setTimesheetStatus,
} from "@/features/demo/store/timeActions";
import { useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import type { StoredTimesheetRow, TimeAdjustment, TimesheetStatus } from "../types";

export function useTimeActions(allRows: StoredTimesheetRow[], scopedRows: StoredTimesheetRow[]) {
  const store = useWorkspaceStore();
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const statusOf = React.useCallback((row: StoredTimesheetRow): TimesheetStatus => row.status, []);
  const flaggedIds = React.useMemo(
    () => new Set(allRows.filter((row) => row.flagged).map((row) => row.id)),
    [allRows],
  );

  const toggleApprove = (row: StoredTimesheetRow) => {
    const previous = row.status;
    const next = previous === "approved" ? "pending" : "approved";
    setTimesheetStatus(
      store,
      [row.id],
      next,
      `${next === "approved" ? "Approved" : "Reverted"} by Alex Thompson.`,
    );
    toast[next === "approved" ? "success" : "info"](next === "approved" ? "Approved" : "Reverted", {
      description:
        next === "approved"
          ? `${row.n}'s entry is ready to export as approved hours.`
          : `${row.n}'s approval reverted to pending.`,
      action: {
        label: "Undo",
        onClick: () => setTimesheetStatus(store, [row.id], previous, "Restored from undo."),
      },
    });
  };

  const approve = (row: StoredTimesheetRow, note = "") => {
    if (row.status === "approved") return;
    setTimesheetStatus(store, [row.id], "approved", note || "Approved by Alex Thompson.");
    toast.success("Approved", {
      description: `${row.n}'s entry is ready to export as approved hours.`,
    });
  };

  const toggleFlag = (row: StoredTimesheetRow) => {
    const next = !row.flagged;
    setTimesheetFlagged(store, [row.id], next, "Updated by Alex Thompson.");
    toast[next ? "warning" : "info"](next ? "Flagged" : "Flag removed", {
      description: `${row.n}'s entry ${next ? "flagged for review" : "unflagged"}.`,
      action: {
        label: "Undo",
        onClick: () =>
          setTimesheetFlagged(store, [row.id], !next, "Flag state restored from undo."),
      },
    });
  };

  const bulkApprove = (ids: string[], label: string) => {
    const previous = allRows
      .filter((row) => ids.includes(row.id))
      .map((row) => [row.id, row.status] as const);
    if (previous.length === 0) return;
    setTimesheetStatus(store, ids, "approved", "Bulk approved by Alex Thompson.");
    toast.success(label, {
      description: `${ids.length} timesheet${ids.length === 1 ? "" : "s"} approved.`,
      action: {
        label: "Undo",
        onClick: () =>
          previous.forEach(([id, status]) =>
            setTimesheetStatus(store, [id], status, "Bulk approval undone."),
          ),
      },
    });
  };

  const approveSelection = () => {
    bulkApprove([...selectedIds], "Timesheets approved");
    setSelectedIds(new Set());
  };
  const flagSelection = () => {
    const ids = [...selectedIds];
    setTimesheetFlagged(store, ids, true, "Bulk flagged by Alex Thompson.");
    toast.warning("Flagged for review", {
      description: `${ids.length} timesheet${ids.length === 1 ? "" : "s"} flagged.`,
      action: {
        label: "Undo",
        onClick: () => setTimesheetFlagged(store, ids, false, "Bulk flags removed from undo."),
      },
    });
    setSelectedIds(new Set());
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = (visibleRows: StoredTimesheetRow[]) =>
    setSelectedIds((previous) => {
      const ids = visibleRows.map((row) => row.id);
      const next = new Set(previous);
      if (ids.every((id) => previous.has(id))) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  const saveAdjustment = (row: StoredTimesheetRow, adjustment: TimeAdjustment) => {
    adjustTimesheet(store, row.id, adjustment);
    toast.success("Adjustment saved", {
      description: `${row.n}'s timesheet and audit trail were updated.`,
    });
  };

  return {
    selectedIds,
    flaggedIds,
    statusOf,
    suggestedRows: scopedRows
      .filter((row) => row.exc === "—" && row.status !== "approved")
      .slice(0, 3),
    toggleApprove,
    approve,
    revert: toggleApprove,
    toggleFlag,
    approveSelection,
    flagSelection,
    approveAllPending: () =>
      bulkApprove(
        scopedRows.filter((row) => row.status === "pending").map((row) => row.id),
        "Bulk approved",
      ),
    bulkApprove,
    toggleSelect,
    toggleAll,
    clearSelection: () => setSelectedIds(new Set()),
    saveAdjustment,
  };
}
