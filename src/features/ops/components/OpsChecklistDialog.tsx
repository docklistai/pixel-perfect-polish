import * as React from "react";
import { ClipboardCheck } from "lucide-react";
import { ActionButton, DialogShell } from "@/components/dl";
import type {
  OpsChecklistRun,
  OpsChecklistTemplate,
  OpsDepartment,
  OpsLocation,
  OpsStaffOption,
} from "../types";
import { OpsChecklistRunsPanel } from "./OpsChecklistRunsPanel";
import { OpsChecklistTemplatePanel } from "./OpsChecklistTemplatePanel";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedRunId: string | null;
  templates: OpsChecklistTemplate[];
  runs: OpsChecklistRun[];
  locations: OpsLocation[];
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
  pending: boolean;
  onCreateTemplate: (value: {
    name: string;
    locationId: string | null;
    departmentId: string | null;
    shiftType: "opening" | "day" | "closing" | "overnight" | "other" | null;
    daypart: "morning" | "afternoon" | "evening" | "overnight" | null;
    items: Array<{ label: string; requiresNote: boolean }>;
  }) => Promise<boolean>;
  onSetTemplateActive: (templateId: string, active: boolean) => Promise<boolean>;
  onStartRun: (value: {
    templateId: string;
    locationId: string;
    runDate: string;
    assignedStaffMemberId: string | null;
  }) => Promise<string | null>;
  onSetItem: (
    id: string,
    state: "pending" | "done" | "exception",
    note: string | null,
  ) => Promise<boolean>;
  onReview: (id: string) => Promise<boolean>;
  onOpenEntry: (id: string) => void;
}

export function OpsChecklistDialog(props: Props) {
  const [mode, setMode] = React.useState<"runs" | "template">("runs");
  React.useEffect(() => {
    if (props.open && props.selectedRunId) setMode("runs");
  }, [props.open, props.selectedRunId]);
  return (
    <DialogShell
      open={props.open}
      onOpenChange={(open) => !open && props.onClose()}
      title="Operational checklists"
      description="Reusable lightweight checklists, manual runs, exceptions, and manager review"
      icon={ClipboardCheck}
      iconTone="brand"
      size="lg"
      footer={
        <ActionButton variant="ghost" onClick={props.onClose}>
          Close
        </ActionButton>
      }
    >
      <div className="dl-tabs mb-4">
        <button
          type="button"
          className={`dl-tab ${mode === "runs" ? "active" : ""}`}
          onClick={() => setMode("runs")}
        >
          Runs & history
        </button>
        <button
          type="button"
          className={`dl-tab ${mode === "template" ? "active" : ""}`}
          onClick={() => setMode("template")}
        >
          New template
        </button>
      </div>
      {mode === "template" ? (
        <OpsChecklistTemplatePanel
          locations={props.locations}
          departments={props.departments}
          templates={props.templates}
          pending={props.pending}
          onCreate={props.onCreateTemplate}
          onSetActive={props.onSetTemplateActive}
          onCreated={() => setMode("runs")}
        />
      ) : (
        <OpsChecklistRunsPanel
          selectedRunId={props.selectedRunId}
          templates={props.templates}
          runs={props.runs}
          locations={props.locations}
          staff={props.staff}
          pending={props.pending}
          onStart={props.onStartRun}
          onSetItem={props.onSetItem}
          onReview={props.onReview}
          onOpenEntry={props.onOpenEntry}
        />
      )}
    </DialogShell>
  );
}
