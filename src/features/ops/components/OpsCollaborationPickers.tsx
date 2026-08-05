import { StatusBadge } from "@/components/dl";
import type { OpsLinkableEntry, OpsManagerOption } from "../types";

function toggle(values: string[], id: string): string[] {
  return values.includes(id) ? values.filter((value) => value !== id) : [...values, id];
}

export function OpsManagerRecipientPicker(props: {
  managers: OpsManagerOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label?: string;
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-medium">{props.label ?? "Manager recipients"}</div>
      <div className="flex flex-wrap gap-2">
        {props.managers.map((manager) => (
          <label key={manager.id} className="badge outline cursor-pointer">
            <input
              type="checkbox"
              checked={props.selectedIds.includes(manager.id)}
              onChange={() => props.onChange(toggle(props.selectedIds, manager.id))}
            />
            {manager.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export function OpsEntryPicker(props: {
  entries: OpsLinkableEntry[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  label: string;
  emptyText?: string;
  showPriority?: boolean;
}) {
  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center">
        <span className="text-xs font-medium">{props.label}</span>
        <StatusBadge tone="warning" className="ml-auto">
          {props.selectedIds.length} attached
        </StatusBadge>
      </div>
      <div className="max-h-36 space-y-1 overflow-y-auto rounded-lg border border-border p-2">
        {props.entries.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            {props.emptyText ?? "No relevant items."}
          </p>
        ) : (
          props.entries.map((entry) => (
            <label
              key={entry.id}
              className="flex cursor-pointer items-center gap-2 rounded-md p-2 text-xs hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={props.selectedIds.includes(entry.id)}
                onChange={() => props.onChange(toggle(props.selectedIds, entry.id))}
              />
              <span className="min-w-0 flex-1 truncate">{entry.title}</span>
              {props.showPriority && <StatusBadge tone="muted">{entry.priority}</StatusBadge>}
            </label>
          ))
        )}
      </div>
    </div>
  );
}
