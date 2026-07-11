import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { SectionCard, FieldLabel, TextField, PreviewTag } from "./SettingsPrimitives";
import { useRoleBudgets } from "../hooks/useRoleBudgets";

function formatHours(minutes: number): string {
  const hours = minutes / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/**
 * Optional per-role weekly hours caps (e.g. "Kitchen 200h/week"). Live for
 * manager workspaces; drives the Rota per-role budget warnings.
 */
export function RoleBudgetsSection() {
  const live = useRoleBudgets();
  const [role, setRole] = React.useState("");
  const [hours, setHours] = React.useState("");

  const handleAdd = async () => {
    const trimmedRole = role.trim();
    const parsedHours = Number(hours.replace(/[^\d.]/g, ""));
    if (trimmedRole.length === 0) {
      toast.error("Name the role", { description: "Enter the role or area this budget covers." });
      return;
    }
    if (!Number.isFinite(parsedHours) || parsedHours < 0 || parsedHours > 16000) {
      toast.error("Check the hours", { description: "Weekly hours must be a number (e.g. 200)." });
      return;
    }
    const result = await live.save({
      roleName: trimmedRole,
      weeklyBudgetMinutes: Math.round(parsedHours * 60),
    });
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setRole("");
    setHours("");
    toast.success("Role budget saved");
  };

  return (
    <SectionCard
      title="Role budgets"
      badge={
        live.enabled ? (
          <PreviewTag>Live — drives Rota</PreviewTag>
        ) : (
          <PreviewTag>Preview in demo mode</PreviewTag>
        )
      }
      description="Optional weekly hours caps per role or area. The Rota warns when a role goes over."
    >
      {live.enabled && live.budgets.length > 0 && (
        <ul className="mb-3 space-y-2">
          {live.budgets.map((budget) => (
            <li
              key={budget.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm font-medium">{budget.roleName}</span>
              <div className="flex shrink-0 items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {formatHours(budget.weeklyBudgetMinutes)}h / week
                </span>
                <button
                  type="button"
                  onClick={() => void live.remove(budget.id)}
                  aria-label={`Remove ${budget.roleName} budget`}
                  className="rounded-lg border border-border p-1.5 text-muted-foreground transition hover:bg-danger-soft/40 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label className="space-y-1.5">
          <FieldLabel>Role or area</FieldLabel>
          <TextField
            value={role}
            disabled={!live.enabled}
            placeholder="e.g. Kitchen"
            onChange={(event) => setRole(event.target.value)}
          />
        </label>
        <label className="space-y-1.5">
          <FieldLabel>Weekly hours</FieldLabel>
          <TextField
            value={hours}
            inputMode="decimal"
            disabled={!live.enabled}
            placeholder="200"
            className="sm:w-28"
            onChange={(event) => setHours(event.target.value)}
          />
        </label>
        <div className="flex items-end">
          <ActionButton
            icon={Plus}
            onClick={() => void handleAdd()}
            disabled={!live.enabled || live.isSaving}
          >
            Add
          </ActionButton>
        </div>
      </div>
      {!live.enabled && (
        <p className="mt-2 text-xs text-muted-foreground">
          Demo workspace — role budgets are shown for preview and are not saved.
        </p>
      )}
    </SectionCard>
  );
}
