import { DetailRow } from "@/components/dl";
import { FieldLabel, SectionCard, SelectField, TextField, ToggleRow } from "./SettingsPrimitives";

export function TimeRulesTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Time & attendance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Local scheduling defaults for the preview, not a backend workflow.
        </p>
      </div>

      <SectionCard title="Shift defaults" description="Used when creating a new shift draft.">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Default start</FieldLabel>
            <TextField defaultValue="09:00" onChange={onDirty} />
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Default end</FieldLabel>
            <TextField defaultValue="17:00" onChange={onDirty} />
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Unpaid break</FieldLabel>
            <TextField defaultValue="30 mins" onChange={onDirty} />
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Working time" description="Honest labels for break and overtime rules.">
        <div className="space-y-3">
          <ToggleRow
            label="Round time to 5 minutes"
            description="Applies a small local preview rule to the shift editor."
            ariaLabel="Round time to 5 minutes"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Require break on long shifts"
            description="A simple reminder in the preview only."
            ariaLabel="Require break on long shifts"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Date and time format"
        description="How dates appear in the editor and exports."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Time format</FieldLabel>
            <SelectField defaultValue="24h" onChange={onDirty}>
              <option value="24h">24-hour</option>
              <option value="12h">12-hour</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Date format</FieldLabel>
            <SelectField defaultValue="dd-mmm-yyyy" onChange={onDirty}>
              <option value="dd-mmm-yyyy">DD MMM YYYY</option>
              <option value="dd-mm-yyyy">DD/MM/YYYY</option>
              <option value="mmm-dd-yyyy">MMM DD, YYYY</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Week start</FieldLabel>
            <SelectField defaultValue="monday" onChange={onDirty}>
              <option value="monday">Monday</option>
              <option value="sunday">Sunday</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Working time note" description="Keep the copy simple and local.">
        <div className="space-y-2">
          <DetailRow label="Threshold" value="8 hours" />
          <DetailRow label="Break reminder" value="Shown in preview" />
          <DetailRow label="Dirty state" value="Local only" />
        </div>
      </SectionCard>
    </div>
  );
}
