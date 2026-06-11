import * as React from "react";
import {
  SectionCard,
  FieldLabel,
  TextField,
  SelectField,
  ToggleRow,
  PreviewTag,
} from "./SettingsPrimitives";
import { SettingsToggle } from "./SettingsToggle";
import { Info } from "lucide-react";

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
          Defaults applied to all new rotas. Individual rotas can override.
        </p>
      </div>

      <SectionCard title="Defaults" description="Starting points for new scheduling periods.">
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

      <SectionCard title="Behaviour" description="Enable or disable key rota options.">
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
        title="Labour targets"
        badge={<PreviewTag>Used by Rota &amp; Home</PreviewTag>}
        description="Set the weekly budget and labour % target to drive budget warnings on the Rota and Dashboard."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Weekly hours budget</FieldLabel>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground font-semibold">
                h
              </span>
              <TextField defaultValue="820" className="border-0 rounded-none" onChange={onDirty} />
            </div>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Target labour %</FieldLabel>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground font-semibold">
                %
              </span>
              <TextField defaultValue="30" className="border-0 rounded-none" onChange={onDirty} />
            </div>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Forecast weekly sales</FieldLabel>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground font-semibold">
                £
              </span>
              <TextField
                defaultValue="64,000"
                className="border-0 rounded-none"
                onChange={onDirty}
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Avg hourly cost (fallback)</FieldLabel>
            <div className="flex overflow-hidden rounded-xl border border-border">
              <span className="flex items-center bg-muted px-3 text-xs text-muted-foreground font-semibold">
                £
              </span>
              <TextField
                defaultValue="13.20"
                className="border-0 rounded-none"
                onChange={onDirty}
              />
            </div>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Budget warning threshold</FieldLabel>
            <SelectField defaultValue="95" onChange={onDirty}>
              <option value="95">Warn at 95% of budget</option>
              <option value="90">Warn at 90% of budget</option>
              <option value="100">Warn at 100% of budget</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Apply to</FieldLabel>
            <SelectField defaultValue="all" onChange={onDirty}>
              <option value="all">All locations (this workspace)</option>
              <option value="brighton">Harbour View only</option>
              <option value="hove">The Anchor Inn only</option>
            </SelectField>
          </label>
        </div>

        <div className="mt-4 flex gap-2.5 rounded-2xl border border-teal-500/20 bg-teal-500/5 p-4 text-sm text-teal-800 dark:text-teal-200">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            These figures appear in <strong>Rota → Labour summary</strong> and{" "}
            <strong>Home → Labour watch</strong>. They are not connected to payroll or finance
            software — they are planning targets only.
          </p>
        </div>
      </SectionCard>

      <SectionCard
        title="Conflict detection"
        description="When the rota engine should warn you of scheduling issues."
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
