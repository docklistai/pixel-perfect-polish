import { Filter, CalendarPlus, Plus } from "lucide-react";
import { ActionButton, StatusBadge } from "@/components/dl";

export function RotaGridToolbar({
  conflictCount,
  openShiftCount,
  coveragePct,
  onFilter,
  onGenerateRota,
  onAddShift,
  onViewConflicts,
}: {
  conflictCount: number;
  openShiftCount: number;
  coveragePct: number;
  onFilter: () => void;
  onGenerateRota: () => void;
  onAddShift: () => void;
  onViewConflicts: () => void;
}) {
  const coverageTone = coveragePct >= 95 ? "success" : coveragePct >= 80 ? "warning" : "danger";
  const conflictTone = conflictCount > 0 ? "danger" : "muted";
  const openShiftTone = openShiftCount > 0 ? "warning" : "muted";
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3.5">
      <ActionButton variant="secondary" size="sm" icon={Filter} onClick={onFilter}>
        Filters
      </ActionButton>
      <div className="hidden flex-wrap items-center gap-2 sm:flex">
        <StatusBadge tone={conflictTone} dot>
          {conflictCount} Conflicts
        </StatusBadge>
        <StatusBadge tone={openShiftTone} dot>
          {openShiftCount} Open shifts
        </StatusBadge>
        <StatusBadge tone={coverageTone} dot>
          {coveragePct}% Coverage
        </StatusBadge>
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <ActionButton variant="outline" size="sm" icon={CalendarPlus} onClick={onGenerateRota}>
          Fill open shifts
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
