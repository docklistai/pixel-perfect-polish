import { ChevronLeft, ChevronRight, Calendar, MoreHorizontal, Send, Sparkles } from "lucide-react";
import { FilterButton, IconButton, StatusBadge, ActionButton } from "@/components/dl";

type StatusTone = "success" | "warning";

export function RotaPageHeader({
  weekLabel,
  statusTone,
  statusLabel,
  canPublish,
  onPrevWeek,
  onPickWeek,
  onNextWeek,
  onMoreActions,
  onGenerateRota,
  onPublish,
}: {
  weekLabel: string;
  statusTone: StatusTone;
  statusLabel: string;
  canPublish: boolean;
  onPrevWeek: () => void;
  onPickWeek: () => void;
  onNextWeek: () => void;
  onMoreActions: () => void;
  onGenerateRota: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[2rem] font-semibold tracking-tight md:text-[2.125rem]">Rota</h1>
          <StatusBadge tone={statusTone} dot>
            {statusLabel}
          </StatusBadge>
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Week of {weekLabel} · Harbour View Hotel
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
        <IconButton icon={ChevronLeft} label="Previous week" onClick={onPrevWeek} />
        <FilterButton icon={Calendar} label={weekLabel} onClick={onPickWeek} />
        <IconButton icon={ChevronRight} label="Next week" onClick={onNextWeek} />
        <ActionButton variant="outline" size="sm" icon={Sparkles} onClick={onGenerateRota}>
          Generate
        </ActionButton>
        {canPublish && (
          <ActionButton size="sm" icon={Send} onClick={onPublish}>
            Publish
          </ActionButton>
        )}
        <IconButton icon={MoreHorizontal} label="More actions" onClick={onMoreActions} />
      </div>
    </div>
  );
}
