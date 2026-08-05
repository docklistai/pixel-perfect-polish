import { Plus, X } from "lucide-react";
import { ActionButton, IconButton } from "@/components/dl";

export interface ChecklistDraftItem {
  label: string;
  requiresNote: boolean;
}

export function OpsChecklistItemEditor(props: {
  items: ChecklistDraftItem[];
  onChange: (items: ChecklistDraftItem[]) => void;
}) {
  const update = (index: number, value: Partial<ChecklistDraftItem>) =>
    props.onChange(
      props.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...value } : item)),
    );
  return (
    <div className="space-y-2">
      {props.items.map((item, index) => (
        <div
          key={index}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2"
        >
          <input
            aria-label={`Checklist item ${index + 1}`}
            className="input min-w-0 flex-1"
            maxLength={300}
            value={item.label}
            onChange={(event) => update(index, { label: event.target.value })}
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={item.requiresNote}
              onChange={(event) => update(index, { requiresNote: event.target.checked })}
            />
            Require note
          </label>
          <IconButton
            icon={X}
            label={`Remove checklist item ${index + 1}`}
            onClick={() =>
              props.onChange(props.items.filter((_, itemIndex) => itemIndex !== index))
            }
          />
        </div>
      ))}
      <ActionButton
        type="button"
        variant="outline"
        size="sm"
        icon={Plus}
        onClick={() => props.onChange([...props.items, { label: "", requiresNote: false }])}
      >
        Add item
      </ActionButton>
    </div>
  );
}
