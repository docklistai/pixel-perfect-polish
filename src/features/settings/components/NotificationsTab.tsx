import { toast } from "sonner";
import { SectionCard, ToggleRow, SelectField, PreviewTag } from "./SettingsPrimitives";
import { Info } from "lucide-react";
import { NotificationMatrixSettings } from "./NotificationMatrixSettings";

export function NotificationsTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Live in-app rota and request updates go to affected recipients. Other delivery channels
          below remain preview preferences.
        </p>
      </div>

      <NotificationMatrixSettings onDirty={onDirty} />

      <SectionCard title="Manager digests" description="Cadence for compiled logs and digests.">
        <div className="space-y-3">
          <ToggleRow
            label="Weekly summary"
            description="Prepared every Monday at 8:00am for all managers."
            ariaLabel="Weekly summary toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="End-of-day handover"
            description="Reminder at 22:00 to write your handover note for the next manager."
            ariaLabel="End-of-day handover toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Pre-publish reminder"
            description="Friday 14:00 if next week's rota is still draft."
            ariaLabel="Pre-publish reminder toggle"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="People moments"
        badge={<PreviewTag>Manager-only</PreviewTag>}
        description="Private reminders that appear on the Team page (visible to managers only)."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Birthday reminders"
            description="Manager-only reminder on the Team page. You prepare a note or announcement if you choose to."
            ariaLabel="Birthday reminders toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Work anniversaries"
            description="Appears as a private manager reminder — not visible to staff."
            ariaLabel="Work anniversaries toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Probation review due"
            description="Reminder 7 days before review date. Visible to managers only."
            ariaLabel="Probation review due toggle"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Training reminders"
        badge={<PreviewTag>Manager-only</PreviewTag>}
        description="Manager reminders for required training certificates. Docklist tracks records — it is not a training provider."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Enable training reminders"
            description="Surface missing or expiring training as manager reminders."
            ariaLabel="Enable training reminders toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show missing / expiring training on Staff Profile"
            description="Adds a training status block to each staff record."
            ariaLabel="Show missing training toggle"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Show upcoming training on Team"
            description="Lists scheduled training in the Team side panel."
            ariaLabel="Show upcoming training toggle"
            onDirty={onDirty}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Default reminder window
              </span>
              <SelectField defaultValue="30" onChange={onDirty}>
                <option value="30">30 days before due</option>
                <option value="14">14 days before due</option>
                <option value="7">7 days before due</option>
              </SelectField>
            </label>
            <label className="space-y-1.5">
              <span className="text-xs font-semibold text-muted-foreground">
                Training requirements
              </span>
              <button
                type="button"
                onClick={() =>
                  toast.info("Training requirements", {
                    description: "Requirement management arrives with the training rollout.",
                  })
                }
                className="w-full flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted/50"
              >
                <span>Manage training requirements</span>
                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview
                </span>
              </button>
            </label>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="flex gap-2.5 rounded-2xl border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground">Quiet hours.</strong> Overnight reminders queue and
            arrive from 7:00 so nobody is woken by a rota change.
          </p>
        </div>
        <div className="flex gap-2.5 rounded-2xl border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-foreground">One place to review.</strong> Everything that needs
            a decision also appears in the notification drawer, whatever the channel.
          </p>
        </div>
      </div>
    </div>
  );
}
