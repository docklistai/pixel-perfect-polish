import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal } from "lucide-react";
import { FilterButton, IconButton, StatusBadge } from "@/components/dl";

type StatusTone = "success" | "warning";

export function RotaPageHeader({
  weekLabel,
  viewModeLabel,
  statusTone,
  statusLabel,
  onPrevWeek,
  onPickWeek,
  onNextWeek,
  onChangeViewMode,
  onMoreActions,
}: {
  weekLabel: string;
  viewModeLabel: string;
  statusTone: StatusTone;
  statusLabel: string;
  onPrevWeek: () => void;
  onPickWeek: () => void;
  onNextWeek: () => void;
  onChangeViewMode: () => void;
  onMoreActions: () => void;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">Rota</h1>
          <StatusBadge tone={statusTone} dot>
            {statusLabel}
          </StatusBadge>
        </div>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
          Week of {weekLabel} · Harbour View Hotel
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5 lg:justify-end">
        <IconButton icon={ChevronLeft} label="Previous week" onClick={onPrevWeek} />
        <FilterButton icon={Calendar} label={weekLabel} onClick={onPickWeek} />
        <IconButton icon={ChevronRight} label="Next week" onClick={onNextWeek} />
        <FilterButton label={`${viewModeLabel} view`} onClick={onChangeViewMode} />
        <IconButton icon={MoreHorizontal} label="More actions" onClick={onMoreActions} />
      </div>
    </div>
  );
}
