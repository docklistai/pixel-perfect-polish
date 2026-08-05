import * as React from "react";
import { Plus } from "lucide-react";
import { ActionButton, FormRow, StatusBadge } from "@/components/dl";
import type { OpsChecklistTemplate, OpsDepartment, OpsLocation } from "../types";
import { OpsChecklistItemEditor, type ChecklistDraftItem } from "./OpsChecklistItemEditor";

type ShiftType = "opening" | "day" | "closing" | "overnight" | "other";
type Daypart = "morning" | "afternoon" | "evening" | "overnight";

export function OpsChecklistTemplatePanel(props: {
  locations: OpsLocation[];
  departments: OpsDepartment[];
  templates: OpsChecklistTemplate[];
  pending: boolean;
  onCreated: () => void;
  onCreate: (value: {
    name: string;
    locationId: string | null;
    departmentId: string | null;
    shiftType: ShiftType | null;
    daypart: Daypart | null;
    items: Array<{ label: string; requiresNote: boolean }>;
  }) => Promise<boolean>;
  onSetActive: (templateId: string, active: boolean) => Promise<boolean>;
}) {
  const [name, setName] = React.useState("");
  const [locationId, setLocationId] = React.useState("");
  const [departmentId, setDepartmentId] = React.useState("");
  const [shiftType, setShiftType] = React.useState("");
  const [daypart, setDaypart] = React.useState("");
  const [items, setItems] = React.useState<ChecklistDraftItem[]>([
    { label: "", requiresNote: false },
  ]);
  const create = async () => {
    const cleanItems = items
      .filter((item) => item.label.trim())
      .map((item) => ({
        label: item.label.trim(),
        requiresNote: item.requiresNote,
      }));
    if (!name.trim() || cleanItems.length === 0) return;
    if (
      await props.onCreate({
        name,
        locationId: locationId || null,
        departmentId: departmentId || null,
        shiftType: (shiftType || null) as ShiftType | null,
        daypart: (daypart || null) as Daypart | null,
        items: cleanItems,
      })
    ) {
      setName("");
      setItems([{ label: "", requiresNote: false }]);
      props.onCreated();
    }
  };
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <FormRow label="Template name" htmlFor="ops-check-name">
          <input
            id="ops-check-name"
            className="input w-full"
            maxLength={160}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </FormRow>
      </div>
      <FormRow label="Location" htmlFor="ops-check-location">
        <select
          id="ops-check-location"
          className="select w-full"
          value={locationId}
          onChange={(event) => setLocationId(event.target.value)}
        >
          <option value="">Any location</option>
          {props.locations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Department" htmlFor="ops-check-dept">
        <select
          id="ops-check-dept"
          className="select w-full"
          value={departmentId}
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">Any department</option>
          {props.departments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Shift type" htmlFor="ops-check-shift">
        <select
          id="ops-check-shift"
          className="select w-full"
          value={shiftType}
          onChange={(event) => setShiftType(event.target.value)}
        >
          <option value="">Any shift</option>
          {(["opening", "day", "closing", "overnight", "other"] as const).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </FormRow>
      <FormRow label="Daypart" htmlFor="ops-check-daypart">
        <select
          id="ops-check-daypart"
          className="select w-full"
          value={daypart}
          onChange={(event) => setDaypart(event.target.value)}
        >
          <option value="">Any daypart</option>
          {(["morning", "afternoon", "evening", "overnight"] as const).map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </FormRow>
      <div className="sm:col-span-2">
        <div className="mb-1 text-xs font-medium">Template items</div>
        <OpsChecklistItemEditor items={items} onChange={setItems} />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <ActionButton icon={Plus} onClick={create} disabled={props.pending}>
          Create retained template
        </ActionButton>
      </div>
      <div className="sm:col-span-2 border-t border-border pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Existing templates
        </h3>
        <div className="space-y-2">
          {props.templates.map((template) => (
            <div
              key={template.id}
              className="flex items-center gap-2 rounded-lg border border-border p-2.5"
            >
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{template.name}</span>
              <StatusBadge tone={template.active ? "success" : "muted"}>
                {template.active ? "Active" : "Inactive"}
              </StatusBadge>
              <ActionButton
                size="sm"
                variant="ghost"
                disabled={props.pending}
                onClick={() => props.onSetActive(template.id, !template.active)}
              >
                {template.active ? "Deactivate" : "Activate"}
              </ActionButton>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
