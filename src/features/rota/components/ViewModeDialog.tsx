import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import type { RotaViewMode } from "../types";

export function ViewModeDialog({
  open,
  onOpenChange,
  viewMode,
  onViewModeChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewMode: RotaViewMode;
  onViewModeChange: (mode: RotaViewMode) => void;
}) {
  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="View rota by"
      description="Employee view is the active planning view for this rota."
      size="sm"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            onViewModeChange("employee");
            onOpenChange(false);
          }}
          className="w-full rounded-xl border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Employee</span>
            <StatusBadge tone="success">
              {viewMode === "employee" ? "Selected" : "Active"}
            </StatusBadge>
          </span>
          <span className="mt-1 block text-xs text-muted-foreground">
            Plan the week by staff member. This is the only active rota view in this build.
          </span>
        </button>

        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Other views</span>
            <StatusBadge tone="muted">Hidden</StatusBadge>
          </div>
          <div className="mt-2 space-y-2 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Role</span> - not shown in this view.
            </p>
            <p>
              <span className="font-medium text-foreground">Day</span> - not shown in this view.
            </p>
          </div>
        </div>
      </div>
    </DialogShell>
  );
}
