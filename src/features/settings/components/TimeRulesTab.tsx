import * as React from "react";
import { SectionCard, FieldLabel, SelectField, ToggleRow } from "./SettingsPrimitives";

export function TimeRulesTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Time & attendance
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Clock-in rules, breaks, and review thresholds.
        </p>
      </div>

      <SectionCard
        title="Clock-in & clock-out"
        description="Define how and when staff can log hours."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1.5">
            <FieldLabel>Method</FieldLabel>
            <SelectField defaultValue="mobile" onChange={onDirty}>
              <option value="mobile">Mobile portal (default)</option>
              <option value="kiosk">Tablet kiosk</option>
              <option value="either">Either</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Grace period</FieldLabel>
            <SelectField defaultValue="5" onChange={onDirty}>
              <option value="5">5 minutes</option>
              <option value="10">10 minutes</option>
              <option value="none">No grace</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Early clock-in allowed</FieldLabel>
            <SelectField defaultValue="15" onChange={onDirty}>
              <option value="15">15 minutes before</option>
              <option value="30">30 minutes before</option>
              <option value="never">Never</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Auto clock-out after</FieldLabel>
            <SelectField defaultValue="30" onChange={onDirty}>
              <option value="30">30 min after shift end</option>
              <option value="60">1 hour after shift end</option>
              <option value="manual">Manual only</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Review thresholds"
        description="When a timesheet should be flagged for review."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Flag late clock-in over 10 minutes"
            description="Auto-flag for review."
            ariaLabel="Flag late clock-in over 10 minutes"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Flag early clock-out under 15 minutes"
            description="Auto-flag for review."
            ariaLabel="Flag early clock-out under 15 minutes"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Flag missing break"
            description="When break threshold isn't met."
            ariaLabel="Flag missing break"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Flag timesheet > contract by 20%"
            description="Watch unplanned overtime."
            ariaLabel="Flag timesheet > contract by 20%"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard title="Approval flow" description="Step-by-step review process.">
        <div className="space-y-2.5">
          {[
            { step: "1", title: "Staff confirm", desc: "On mobile after shift end" },
            { step: "2", title: "Supervisor review", desc: "Flagged timesheets only" },
            { step: "3", title: "Manager approval", desc: "Weekly batch — Friday 16:00" },
            {
              step: "4",
              title: "Export · approved-hours CSV",
              desc: "Approved hours only — handed to wages processor",
            },
          ].map((flow, idx) => (
            <div key={idx} className="flex gap-3 rounded-2xl border border-border bg-muted/20 p-3">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-teal-500/10 text-xs font-bold text-teal-600 dark:text-teal-400">
                {flow.step}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-semibold">{flow.title}</div>
                <div className="text-[11px] text-muted-foreground">{flow.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
