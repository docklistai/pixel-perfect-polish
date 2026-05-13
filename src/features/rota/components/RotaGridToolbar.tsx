import { Filter, SlidersHorizontal, Copy, CalendarPlus, Plus } from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/dl";

export function RotaGridToolbar({
  conflictCount,
  openShiftCount,
  onFilter,
  onTemplates,
  onCopyLastWeek,
  onGenerateRota,
  onAddShift,
  onViewConflicts,
}: {
  conflictCount: number;
  openShiftCount: number;
  onFilter: () => void;
  onTemplates: () => void;
  onCopyLastWeek: () => void;
  onGenerateRota: () => void;
  onAddShift: () => void;
  onViewConflicts: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
      <ActionButton variant="secondary" size="sm" icon={Filter} onClick={onFilter}>
        Filters
      </ActionButton>
      <StatusBadge tone="danger" dot>
        {conflictCount} Conflicts
      </StatusBadge>
      <StatusBadge tone="warning" dot>
        {openShiftCount} Open shifts
      </StatusBadge>
      <StatusBadge tone="success" dot>
        98% Coverage
      </StatusBadge>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ActionButton variant="secondary" size="sm" icon={SlidersHorizontal} onClick={onTemplates}>
          Templates
        </ActionButton>
        <ActionButton variant="secondary" size="sm" icon={Copy} onClick={onCopyLastWeek}>
          Copy last week
        </ActionButton>
        <ActionButton variant="outline" size="sm" icon={CalendarPlus} onClick={onGenerateRota}>
          Generate rota
        </ActionButton>
        <ActionButton variant="secondary" size="sm" icon={Plus} onClick={onAddShift}>
          Add shift
        </ActionButton>
        <ActionButton variant="secondary" size="sm" onClick={onViewConflicts}>
          View conflicts
        </ActionButton>
      </div>
    </div>
  );
}
