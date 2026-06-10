import { Info } from "lucide-react";
import { DrawerShell, FormSection, FormRow, ActionButton } from "@/components/dl";
import type { DrawerMode } from "../types";

interface OpsDrawerProps {
  mode: DrawerMode;
  onClose: () => void;
}

const drawerTitles: Record<NonNullable<DrawerMode>, string> = {
  incident: "Log a new entry",
  task: "Add task",
  handover: "Add handover note",
};

const drawerDescriptions: Record<NonNullable<DrawerMode>, string> = {
  incident: "Incident, maintenance ticket, or general note",
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
          <ActionButton onClick={onClose}>Save entry</ActionButton>
        </>
      }
    >
      <FormSection title="Details">
        <FormRow label="Title" required htmlFor="ops-drawer-title">
          <input
            id="ops-drawer-title"
            placeholder="Short description — e.g. AC not cooling, Room 412"
            className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm"
          />
        </FormRow>
        {mode === "incident" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Type" htmlFor="ops-drawer-type">
                <select
                  id="ops-drawer-type"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Incident</option>
                  <option>Maintenance</option>
                  <option>Shift briefing</option>
                  <option>Handover note</option>
                  <option>General note</option>
                </select>
              </FormRow>
              <FormRow label="Severity" htmlFor="ops-drawer-severity">
                <select
                  id="ops-drawer-severity"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Critical</option>
                </select>
              </FormRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormRow label="Location" htmlFor="ops-drawer-location">
                <select
                  id="ops-drawer-location"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Riverside Restaurant</option>
                  <option>Bar</option>
                  <option>Lobby</option>
                  <option>Room (specify)…</option>
                  <option>Kitchen</option>
                </select>
              </FormRow>
              <FormRow label="Logged by" htmlFor="ops-drawer-logged-by">
                <select
                  id="ops-drawer-logged-by"
                  className="w-full h-9 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option>Alex Thompson (you)</option>
                  <option>Sophie Ellis</option>
                  <option>Liam O'Brien</option>
                </select>
              </FormRow>
            </div>
          </>
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
        <FormRow label="Description" htmlFor="ops-drawer-notes">
          <textarea
            id="ops-drawer-notes"
            rows={3}
            placeholder="What happened, when, and any immediate action taken…"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </FormRow>
      </FormSection>
      {mode === "incident" && (
        <>
          <div
            className="rounded-xl border p-4 mb-4"
            style={{
              background: "var(--info-soft, var(--brand-soft))",
              borderColor: "var(--info-border, var(--brand-border, var(--border)))",
            }}
          >
            <div className="flex items-start gap-2 text-xs leading-relaxed text-foreground/80">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-brand" aria-hidden />
              <span>
                The incident is the <strong>record</strong>. If follow-up action is needed, add a
                follow-up task from the incident detail after saving.
              </span>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" defaultChecked className="rounded" />
            Add a follow-up task after saving
          </label>
        </>
      )}
    </DrawerShell>
  );
}
