import * as React from "react";
import { SectionCard, FieldLabel, SelectField, ToggleRow, PreviewTag } from "./SettingsPrimitives";
import { SettingsToggle } from "./SettingsToggle";
import { LabourTargetsSection } from "./LabourTargetsSection";
import { RoleBudgetsSection } from "./RoleBudgetsSection";
import { RoleColoursSection } from "./RoleColoursSection";

function ConflictRuleRow({
  label,
  tone,
  badge,
  onDirty,
}: {
  label: string;
  tone: string;
  badge: string;
  onDirty: () => void;
}) {
  const [on, setOn] = React.useState(true);
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-card/50 p-3">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            tone === "danger"
              ? "bg-danger-soft text-danger"
              : tone === "warning"
                ? "bg-warning-soft text-warning"
                : "bg-info-soft text-info"
          }`}
        >
          {badge}
        </span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <SettingsToggle
        aria-label={`${label} rule`}
        on={on}
        onClick={() => {
          setOn((prev) => !prev);
          onDirty();
        }}
      />
    </div>
  );
}

export function RotaSchedulingTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          Rota & scheduling
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Labour targets are live. The remaining defaults are previews and not yet applied to rotas.
        </p>
      </div>

      <LabourTargetsSection />

      <RoleBudgetsSection />

      <RoleColoursSection />

      <SectionCard
        title="Defaults"
        badge={<PreviewTag />}
        description="Starting points for new scheduling periods. Preview only — not yet applied."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Default shift length</FieldLabel>
            <SelectField defaultValue="8h" onChange={onDirty}>
              <option value="8h">8 hours</option>
              <option value="6h">6 hours</option>
              <option value="12h">12 hours</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Min rest between shifts</FieldLabel>
            <SelectField defaultValue="11h" onChange={onDirty}>
              <option value="11h">11 hours</option>
              <option value="9h">9 hours</option>
              <option value="12h">12 hours</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Auto-break threshold</FieldLabel>
            <SelectField defaultValue="6h" onChange={onDirty}>
              <option value="6h">After 6 hours</option>
              <option value="4h">After 4 hours</option>
              <option value="never">Never auto-apply</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Default publish horizon</FieldLabel>
            <SelectField defaultValue="2w" onChange={onDirty}>
              <option value="2w">2 weeks ahead</option>
              <option value="1w">1 week ahead</option>
              <option value="4w">4 weeks ahead</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Draft auto-save</FieldLabel>
            <SelectField defaultValue="30s" onChange={onDirty}>
              <option value="30s">Every 30 seconds</option>
              <option value="change">On change</option>
              <option value="manual">Manual</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Default rota view</FieldLabel>
            <SelectField defaultValue="week" onChange={onDirty}>
              <option value="week">Week</option>
              <option value="day">Day</option>
              <option value="fortnight">Fortnight</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard
        title="Behaviour"
        badge={<PreviewTag />}
        description="Enable or disable key rota options. Preview only — not yet applied."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Allow staff to swap shifts"
            description="Staff request a swap from the mobile app; managers approve."
            ariaLabel="Allow staff to swap shifts"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show open shifts to eligible staff"
            description="Eligible staff see open shifts and can claim them."
            ariaLabel="Show open shifts to eligible staff"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Auto-apply break thresholds"
            description="Apply unpaid breaks based on shift length."
            ariaLabel="Auto-apply break thresholds"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Staff app update on publish"
            description="Prepares a staff-facing rota update in the app for review before anything is sent."
            ariaLabel="Staff app update on publish"
            onDirty={onDirty}
            preview
          />
          <ToggleRow
            label="Approve overtime automatically"
            description="Overtime over 4 hours/week still requires approval."
            ariaLabel="Approve overtime automatically"
            onDirty={onDirty}
            defaultOn={false}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Conflict detection"
        badge={<PreviewTag />}
        description="When the rota engine should warn you of scheduling issues. Preview only — rota warnings currently use fixed rules."
      >
        <div className="space-y-3">
          {[
            { label: "Less than 11h between shifts", tone: "warning", badge: "Warn" },
            { label: "More than 6 consecutive days", tone: "warning", badge: "Warn" },
            { label: "Outside availability", tone: "warning", badge: "Warn" },
            { label: "Below contracted hours", tone: "info", badge: "Info" },
            { label: "Missing certification for role", tone: "danger", badge: "Block" },
            { label: "Double-booked shift", tone: "danger", badge: "Block" },
          ].map((item) => (
            <ConflictRuleRow key={item.label} {...item} onDirty={onDirty} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
