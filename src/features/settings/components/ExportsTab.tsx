import { DetailRow } from "@/components/dl";
import { SectionCard } from "./SettingsPrimitives";

export function ExportsTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Exports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Preview-only export options for rota and timesheet output.
        </p>
      </div>

      <SectionCard title="Export profile" description="What the manager sees before exporting.">
        <div className="space-y-2">
          <DetailRow label="Format" value="CSV preview" />
          <DetailRow label="Scope" value="Rota, leave, timesheets" />
          <DetailRow label="Notes" value="Shown before download" />
        </div>
      </SectionCard>

      <SectionCard title="Included data" description="Local preview checkboxes only.">
        <div className="space-y-2">
          {[
            "Approved timesheets",
            "Approved leave",
            "Unapproved overtime",
            "Breaks as unpaid time",
          ].map((label, index) => (
            <label key={label} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                defaultChecked={index !== 3}
                onChange={onDirty}
                className="accent-[var(--brand)]"
              />
              {label}
            </label>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Export note" description="Keep the wording honest and local.">
        <div className="space-y-2">
          <DetailRow label="Preview" value="Shown before download" />
          <DetailRow label="Live sync" value="Not used" />
          <DetailRow label="Dirty state" value="Local only" />
        </div>
      </SectionCard>
    </div>
  );
}
