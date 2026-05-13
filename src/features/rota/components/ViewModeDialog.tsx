import { ActionButton, DialogShell, StatusBadge } from "@/components/dl";
import type { RotaViewMode } from "../types";

const viewModes: Array<{
  mode: RotaViewMode;
  label: string;
  description: string;
  disabled?: boolean;
}> = [
  {
    mode: "employee",
    label: "Employee",
    description: "Plan the week by staff member. This is the active rota view.",
  },
  {
    mode: "role",
    label: "Role",
    description: "Group shifts by role once draft grouping is connected.",
    disabled: true,
  },
  {
    mode: "day",
    label: "Day",
    description: "Review each day as a staffing board in a later frontend pass.",
    disabled: true,
  },
];

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
      description="Choose how managers scan the rota while planning."
      size="sm"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <div className="space-y-2">
        {viewModes.map((item) => {
          const selected = viewMode === item.mode;

          return (
            <button
              key={item.mode}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                onViewModeChange(item.mode);
                onOpenChange(false);
              }}
              className="w-full rounded-xl border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold">{item.label}</span>
                {selected ? (
                  <StatusBadge tone="success">Selected</StatusBadge>
                ) : item.disabled ? (
                  <StatusBadge tone="muted">Later</StatusBadge>
                ) : null}
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
            </button>
          );
        })}
      </div>
    </DialogShell>
  );
}
