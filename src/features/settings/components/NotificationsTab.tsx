import { DetailRow } from "@/components/dl";
import { FieldLabel, SectionCard, SelectField, ToggleRow } from "./SettingsPrimitives";

export function NotificationsTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Local toggles for reminder and alert previews. No live backend wiring.
        </p>
      </div>

      <SectionCard
        title="Notification channels"
        description="Preview how reminders would be grouped."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <label className="space-y-1.5">
            <FieldLabel>Delivery</FieldLabel>
            <SelectField defaultValue="in-app-email" onChange={onDirty}>
              <option value="in-app-email">In-app and email</option>
              <option value="in-app">In-app only</option>
              <option value="email">Email only</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Reminder lead time</FieldLabel>
            <SelectField defaultValue="30m" onChange={onDirty}>
              <option value="30m">30 minutes before</option>
              <option value="1h">1 hour before</option>
              <option value="2h">2 hours before</option>
            </SelectField>
          </label>
          <label className="space-y-1.5">
            <FieldLabel>Digest cadence</FieldLabel>
            <SelectField defaultValue="daily" onChange={onDirty}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="off">Off</option>
            </SelectField>
          </label>
        </div>
      </SectionCard>

      <SectionCard title="Alerts" description="The items managers usually check before publishing.">
        <div className="space-y-3">
          <ToggleRow
            label="Rota publish reminders"
            description="Remind the manager when a draft week is ready to review."
            ariaLabel="Rota publish reminders"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Leave request alerts"
            description="Notify managers when leave enters the queue."
            ariaLabel="Leave request alerts"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Timesheet approval reminders"
            description="Surface pending approvals in the manager preview."
            ariaLabel="Timesheet approval reminders"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Shift change notices"
            description="Show important swaps and edits in the team feed."
            ariaLabel="Shift change notices"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Team announcement notifications"
            description="Include team updates in the notification preview."
            ariaLabel="Team announcement notifications"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Notification note"
        description="Keep the copy honest and preview-focused."
      >
        <div className="space-y-2">
          <DetailRow label="Delivery mode" value="In-app and email" />
          <DetailRow label="Reminder type" value="Preview only" />
          <DetailRow label="Dirty state" value="Local only" />
        </div>
      </SectionCard>
    </div>
  );
}
