import { FormRow } from "@/components/dl";
import type { OpsEntryDraft } from "../api/opsEntryMutations";
import { ENTRY_TYPE_LABEL } from "../lib/opsPresentation";
import type { OpsDepartment, OpsLocation, OpsStaffOption } from "../types";
import { OpsIncidentFields } from "./OpsIncidentFields";

type Draft = OpsEntryDraft;
export type OpsDraftSetter = <K extends keyof Draft>(key: K, value: Draft[K]) => void;

function toLocalInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function OpsLogEntryFields(props: {
  draft: Draft;
  set: OpsDraftSetter;
  locations: OpsLocation[];
  departments: OpsDepartment[];
  staff: OpsStaffOption[];
  editing: boolean;
}) {
  const activeStaff = [...props.staff].sort(
    (a, b) => Number(b.onShift) - Number(a.onShift) || a.name.localeCompare(b.name),
  );
  const { draft, set } = props;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormRow label="Title" htmlFor="ops-log-title">
          <input
            id="ops-log-title"
            className="input w-full"
            value={draft.title}
            maxLength={200}
            onChange={(event) => set("title", event.target.value)}
          />
        </FormRow>
      </div>
      <FormRow label="Type" htmlFor="ops-log-type">
        <select
          id="ops-log-type"
          className="select w-full"
          disabled={props.editing}
          value={draft.entryType}
          onChange={(event) => {
            const value = event.target.value as Draft["entryType"];
            set("entryType", value);
            if (value !== "incident") {
              set("severity", null);
              set("occurredAt", null);
              set("immediateAction", null);
            }
          }}
        >
          {Object.entries(ENTRY_TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Priority" htmlFor="ops-log-priority">
        <select
          id="ops-log-priority"
          className="select w-full"
          value={draft.priority}
          onChange={(event) => set("priority", event.target.value as Draft["priority"])}
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </FormRow>
      <FormRow label="Location" htmlFor="ops-log-location">
        <select
          id="ops-log-location"
          className="select w-full"
          disabled={props.editing}
          value={draft.locationId}
          onChange={(event) => set("locationId", event.target.value)}
        >
          <option value="">Select location</option>
          {props.locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Area" htmlFor="ops-log-area">
        <input
          id="ops-log-area"
          className="input w-full"
          maxLength={120}
          value={draft.area ?? ""}
          placeholder="Room, floor, or zone"
          onChange={(event) => set("area", event.target.value || null)}
        />
      </FormRow>
      <FormRow label="Department" htmlFor="ops-log-department">
        <select
          id="ops-log-department"
          className="select w-full"
          value={draft.departmentId ?? ""}
          onChange={(event) => set("departmentId", event.target.value || null)}
        >
          <option value="">No department</option>
          {props.departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Assignee" htmlFor="ops-log-assignee">
        <select
          id="ops-log-assignee"
          className="select w-full"
          value={draft.assignedStaffMemberId ?? ""}
          onChange={(event) => set("assignedStaffMemberId", event.target.value || null)}
        >
          <option value="">Unassigned</option>
          {activeStaff.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.onShift ? " · on shift" : ""}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Related staff" htmlFor="ops-log-staff">
        <select
          id="ops-log-staff"
          className="select w-full"
          value={draft.subjectStaffMemberId ?? ""}
          onChange={(event) => set("subjectStaffMemberId", event.target.value || null)}
        >
          <option value="">No staff link</option>
          {props.staff.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Due time" htmlFor="ops-log-due">
        <input
          id="ops-log-due"
          type="datetime-local"
          className="input w-full"
          value={toLocalInput(draft.dueAt)}
          onChange={(event) =>
            set("dueAt", event.target.value ? new Date(event.target.value).toISOString() : null)
          }
        />
      </FormRow>
      {draft.entryType === "incident" && (
        <OpsIncidentFields draft={draft} set={set} editing={props.editing} />
      )}
      <div className="sm:col-span-2">
        <FormRow label="Description" htmlFor="ops-log-description">
          <textarea
            id="ops-log-description"
            className="textarea w-full"
            rows={3}
            maxLength={4000}
            value={draft.description ?? ""}
            onChange={(event) => set("description", event.target.value || null)}
          />
        </FormRow>
      </div>
    </div>
  );
}
