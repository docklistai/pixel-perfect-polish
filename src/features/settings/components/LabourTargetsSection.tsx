import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ActionButton, AlertCard } from "@/components/dl";
import { SectionCard, FieldLabel, TextField, SelectField, PreviewTag } from "./SettingsPrimitives";
import {
  useSaveWorkspaceLabourSettings,
  useWorkspaceLabourSettings,
} from "../hooks/useWorkspaceLabourSettings";
import type { WorkspaceLabourSettings } from "../api/workspaceSettings";
import {
  buildLabourTargetsPayload,
  labourFieldsFromSettings,
  type LabourTargetFields,
} from "../lib/labourTargets";

function PrefixedField({
  label,
  prefix,
  value,
  onChange,
  disabled,
  inputMode = "decimal",
}: {
  label: string;
  prefix: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex overflow-hidden rounded-xl border border-border">
        <span className="flex items-center bg-muted px-3 text-xs font-semibold text-muted-foreground">
          {prefix}
        </span>
        <TextField
          value={value}
          inputMode={inputMode}
          disabled={disabled}
          className="rounded-none border-0"
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </label>
  );
}

/**
 * Live labour planning targets. Unlike the surrounding preview sections, this
 * saves to workspace_settings and drives the Rota labour summary and the Home
 * labour watch.
 */
export function LabourTargetsSection() {
  const live = useWorkspaceLabourSettings();
  const save = useSaveWorkspaceLabourSettings();
  const [fields, setFields] = React.useState<LabourTargetFields | null>(null);

  const loadedSettings: WorkspaceLabourSettings | null = live.settings;
  const editable = live.enabled && !live.isLoading && !live.isError;
  const fieldValues = fields ?? labourFieldsFromSettings(loadedSettings);

  const setField = (key: keyof LabourTargetFields) => (value: string) => {
    setFields({ ...fieldValues, [key]: value });
  };

  const handleSave = async () => {
    const parsed = buildLabourTargetsPayload(fieldValues);
    if (!parsed.ok) {
      toast.error("Check labour targets", { description: parsed.message });
      return;
    }
    try {
      await save.mutateAsync(parsed.payload);
      setFields(null);
      toast.success("Labour targets saved", {
        description: "Rota and Home now use these figures for budget warnings.",
      });
    } catch {
      toast.error("Labour targets not saved", {
        description: "The save didn't reach your workspace. Try again.",
      });
    }
  };

  return (
    <SectionCard
      title="Labour targets"
      badge={
        live.enabled ? (
          <PreviewTag>Live — drives Rota &amp; Home</PreviewTag>
        ) : (
          <PreviewTag>Preview in demo mode</PreviewTag>
        )
      }
      description="Weekly budget, labour % target, and cost assumptions behind budget warnings on the Rota and Dashboard."
    >
      {live.isError && (
        <AlertCard
          className="mb-3"
          tone="warning"
          title="Labour targets couldn't be loaded"
          description="Refresh to try again. Saving is disabled until the current values load."
        />
      )}
      {editable && live.isUnset && fields === null && (
        <AlertCard
          className="mb-3"
          tone="info"
          title="No labour targets set yet"
          description="Set a weekly hours budget and an average hourly cost to see live cost estimates while building the rota."
        />
      )}

      <div className="grid gap-3 md:grid-cols-3">
        <PrefixedField
          label="Weekly hours budget"
          prefix="h"
          value={fieldValues.weeklyBudgetHours}
          onChange={setField("weeklyBudgetHours")}
          disabled={!editable}
        />
        <PrefixedField
          label="Daily hours budget"
          prefix="h"
          value={fieldValues.dailyBudgetHours}
          onChange={setField("dailyBudgetHours")}
          disabled={!editable}
        />
        <PrefixedField
          label="Target labour %"
          prefix="%"
          value={fieldValues.targetLabourPct}
          onChange={setField("targetLabourPct")}
          disabled={!editable}
        />
        <PrefixedField
          label="Forecast weekly sales"
          prefix="£"
          value={fieldValues.forecastWeeklySales}
          onChange={setField("forecastWeeklySales")}
          disabled={!editable}
        />
        <PrefixedField
          label="Avg hourly cost (fallback)"
          prefix="£"
          value={fieldValues.avgHourlyCost}
          onChange={setField("avgHourlyCost")}
          disabled={!editable}
        />
        <label className="space-y-1.5">
          <FieldLabel>Budget warning threshold</FieldLabel>
          <SelectField
            value={fieldValues.budgetWarningPct}
            disabled={!editable}
            onChange={(event) => setField("budgetWarningPct")(event.target.value)}
          >
            <option value="90">Warn at 90% of budget</option>
            <option value="95">Warn at 95% of budget</option>
            <option value="100">Warn at 100% of budget</option>
          </SelectField>
        </label>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-xs leading-5 text-muted-foreground">
          {live.enabled
            ? "Estimates use each staff member's hourly rate where recorded, and the fallback rate otherwise."
            : "Demo workspace — labour targets are shown for preview and are not saved."}
        </p>
        <ActionButton
          onClick={() => void handleSave()}
          disabled={!editable || save.isPending || fields === null}
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          {save.isPending ? "Saving…" : "Save targets"}
        </ActionButton>
      </div>
    </SectionCard>
  );
}
