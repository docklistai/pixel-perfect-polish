import { Save, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/dl";

export function ShiftDetailFooterActions({
  saving,
  canSave,
  onRemove,
  onCancel,
  onSave,
}: {
  saving: boolean;
  canSave: boolean;
  onRemove: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <>
      <ActionButton
        variant="ghost"
        icon={Trash2}
        disabled={saving}
        onClick={onRemove}
        className="text-danger hover:bg-danger-soft/30"
      >
        Remove
      </ActionButton>
      <ActionButton variant="secondary" disabled={saving} onClick={onCancel}>
        Cancel
      </ActionButton>
      <ActionButton icon={Save} disabled={!canSave} onClick={onSave}>
        Save
      </ActionButton>
    </>
  );
}
