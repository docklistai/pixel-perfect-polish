import * as React from "react";
import { toast } from "sonner";
import { LayoutTemplate, Loader2, Plus, Trash2 } from "lucide-react";
import { ActionButton, DrawerShell, FormSection } from "@/components/dl";
import { useDemandTemplates } from "../hooks/useDemandTemplates";
import type { DemandTemplateSummary } from "../api/demandTemplates";

function TemplateRow({
  template,
  disabled,
  onApply,
  onDelete,
}: {
  template: DemandTemplateSummary;
  disabled: boolean;
  onApply: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{template.name}</div>
        <div className="text-[11px] text-muted-foreground">
          {template.totalShifts} open shift{template.totalShifts === 1 ? "" : "s"} ·{" "}
          {template.dayCount} day{template.dayCount === 1 ? "" : "s"}
          {template.notes ? ` · ${template.notes}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <ActionButton
          size="sm"
          variant="secondary"
          icon={Plus}
          onClick={onApply}
          disabled={disabled}
        >
          Apply
        </ActionButton>
        <ActionButton
          size="sm"
          variant="danger"
          icon={Trash2}
          onClick={onDelete}
          disabled={disabled}
          aria-label={`Delete ${template.name}`}
        >
          Delete
        </ActionButton>
      </div>
    </li>
  );
}

/**
 * Save the current week's demand shape as a reusable template, and stamp any
 * template onto the current draft week as open shifts. Templates capture
 * weekday role/count coverage — not a copy of one exact rota.
 */
export function DemandTemplatesDrawer({
  open,
  onOpenChange,
  rotaWeekId,
  weekLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current live draft week, or null when there is nothing to save/apply to. */
  rotaWeekId: string | null;
  weekLabel: string;
}) {
  const templates = useDemandTemplates();
  const [name, setName] = React.useState("");
  const canWrite = rotaWeekId !== null;

  const handleSave = async () => {
    if (!rotaWeekId) return;
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      toast.error("Name your template", { description: "Give this week's shape a short name." });
      return;
    }
    const result = await templates.save(rotaWeekId, trimmed, null);
    if (!result.ok) {
      toast.error("Couldn't save template", { description: result.message });
      return;
    }
    setName("");
    toast.success("Template saved", { description: `Saved this week's demand as "${trimmed}".` });
  };

  const handleApply = async (template: DemandTemplateSummary) => {
    if (!rotaWeekId) return;
    const result = await templates.apply(rotaWeekId, template.id);
    if (!result.ok) {
      toast.error("Couldn't apply template", { description: result.message });
      return;
    }
    toast.success("Template applied", {
      description: `Added ${result.openShiftsCreated ?? 0} open shifts to ${weekLabel}. Assign them, or use Build this week with "This week's existing shifts".`,
    });
  };

  const handleDelete = async (template: DemandTemplateSummary) => {
    const result = await templates.remove(template.id);
    if (!result.ok) {
      toast.error("Couldn't delete", { description: result.message });
      return;
    }
    toast.success("Template deleted", { description: `"${template.name}" is no longer saved.` });
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota templates"
      description="Reusable demand patterns — save a week's shape, stamp it onto another week as open shifts."
      width="lg"
    >
      <FormSection title="Save this week">
        <div className="flex items-end gap-2">
          <label className="flex-1 space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">Template name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Busy event weekend"
              maxLength={80}
              disabled={!canWrite}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm disabled:opacity-50"
            />
          </label>
          <ActionButton
            onClick={() => void handleSave()}
            disabled={!canWrite || templates.isSaving}
          >
            {templates.isSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Save
          </ActionButton>
        </div>
        {!canWrite && (
          <p className="mt-2 text-[11px] text-muted-foreground">
            Open a live draft week to save or apply templates.
          </p>
        )}
      </FormSection>

      <FormSection title="Your templates">
        {templates.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        ) : templates.templates.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/25 p-3">
            <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-xs text-muted-foreground">
              No templates yet. Build a representative week, then save its shape here to reuse it on
              busy or quiet weeks.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {templates.templates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                disabled={!canWrite || templates.isApplying}
                onApply={() => void handleApply(template)}
                onDelete={() => void handleDelete(template)}
              />
            ))}
          </ul>
        )}
      </FormSection>
    </DrawerShell>
  );
}
