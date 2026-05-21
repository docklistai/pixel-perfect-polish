import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import type { DrawerMode } from "../types";

interface OpsDrawerProps {
  mode: DrawerMode;
  onClose: () => void;
}

const drawerTitles: Record<NonNullable<DrawerMode>, string> = {
  incident: "Log incident",
  task: "Add task",
  handover: "Add handover note",
};

const drawerDescriptions: Record<NonNullable<DrawerMode>, string> = {
  incident: "Record the key details for the team.",
  task: "Add a task for the current shift.",
  handover: "Capture the follow-up before the next handover.",
};

export function OpsDrawer({ mode, onClose }: OpsDrawerProps) {
  return (
    <DrawerShell
      open={!!mode}
      onOpenChange={(o) => !o && onClose()}
      title={mode ? drawerTitles[mode] : ""}
      description={mode ? drawerDescriptions[mode] : undefined}
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Cancel
          </ActionButton>
          <ActionButton onClick={onClose}>Save</ActionButton>
        </>
      }
    >
      <FormSection title="Details">
        <FormRow label="Title" required htmlFor="ops-drawer-title">
          <input
            id="ops-drawer-title"
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </FormRow>
        {mode === "incident" && (
          <FormRow label="Severity" htmlFor="ops-drawer-severity">
            <select
              id="ops-drawer-severity"
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </FormRow>
        )}
        {mode === "task" && (
          <FormRow label="Due" htmlFor="ops-drawer-due">
            <input
              id="ops-drawer-due"
              type="date"
              className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
            />
          </FormRow>
        )}
        <FormRow label="Notes" htmlFor="ops-drawer-notes">
          <textarea
            id="ops-drawer-notes"
            className="w-full min-h-24 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </FormRow>
      </FormSection>
      <p className="text-xs text-muted-foreground">Entries are not saved yet in this preview.</p>
    </DrawerShell>
  );
}
