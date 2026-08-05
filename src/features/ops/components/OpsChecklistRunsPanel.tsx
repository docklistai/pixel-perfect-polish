import * as React from "react";
import { ActionButton } from "@/components/dl";
import type { OpsChecklistRun, OpsChecklistTemplate, OpsLocation, OpsStaffOption } from "../types";
import { OpsChecklistRunCard } from "./OpsChecklistRunCard";
import { localDateInTimezone } from "../lib/opsDates";

export function OpsChecklistRunsPanel(props: {
  selectedRunId: string | null;
  templates: OpsChecklistTemplate[];
  runs: OpsChecklistRun[];
  locations: OpsLocation[];
  staff: OpsStaffOption[];
  pending: boolean;
  onStart: (value: {
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
}) {
  const [runId, setRunId] = React.useState(props.selectedRunId ?? props.runs[0]?.id ?? "");
  const [templateId, setTemplateId] = React.useState(
    props.templates.find((item) => item.active)?.id ?? "",
  );
  const [locationId, setLocationId] = React.useState(props.locations[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = React.useState("");
  React.useEffect(() => {
    if (props.selectedRunId) setRunId(props.selectedRunId);
  }, [props.selectedRunId]);
  const compatibleTemplates = props.templates.filter(
    (item) => item.active && (!item.locationId || item.locationId === locationId),
  );
  React.useEffect(() => {
    if (!compatibleTemplates.some((item) => item.id === templateId))
      setTemplateId(compatibleTemplates[0]?.id ?? "");
  }, [compatibleTemplates, templateId]);
  const run = props.runs.find((item) => item.id === runId);
  const start = async () => {
    const location = props.locations.find((item) => item.id === locationId);
    if (location && templateId) {
      const startedRunId = await props.onStart({
        templateId,
        locationId,
        runDate: localDateInTimezone(location.timezone),
        assignedStaffMemberId: assigneeId || null,
      });
      if (startedRunId) setRunId(startedRunId);
    }
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-2 rounded-xl border border-border bg-muted/20 p-3 sm:grid-cols-4">
        <select
          aria-label="Checklist template"
          className="select"
          value={templateId}
          onChange={(event) => setTemplateId(event.target.value)}
        >
          <option value="">Template</option>
          {compatibleTemplates.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Checklist location"
          className="select"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          {props.locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Checklist assignee"
          className="select"
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          <option value="">Unassigned</option>
          {[...props.staff]
            .sort((a, b) => Number(b.onShift) - Number(a.onShift))
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.onShift ? " · on shift" : ""}
              </option>
            ))}
        </select>
        <ActionButton size="sm" onClick={start} disabled={props.pending || !templateId}>
          Start manual run
        </ActionButton>
      </div>
      <select
        aria-label="Checklist history"
        className="select w-full"
        value={runId}
        onChange={(event) => setRunId(event.target.value)}
      >
        <option value="">Select retained run</option>
        {props.runs.map((item) => (
          <option key={item.id} value={item.id}>
            {item.runDate} · {item.templateName} · {item.status}
          </option>
        ))}
      </select>
      {run && (
        <OpsChecklistRunCard
          run={run}
          pending={props.pending}
          onSetItem={props.onSetItem}
          onReview={props.onReview}
          onOpenEntry={props.onOpenEntry}
        />
      )}
    </div>
  );
}
