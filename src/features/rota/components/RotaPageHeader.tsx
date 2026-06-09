import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Eraser,
  Printer,
  Send,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { FilterButton, IconButton, ActionButton } from "@/components/dl";
import { RowActionMenu } from "@/components/RowActionMenu";

type StatusTone = "success" | "warning";

export function RotaPageHeader({
  weekLabel,
  staffCount,
  statusTone,
  statusLabel,
  canPublish,
  onPrevWeek,
  onPickWeek,
  onNextWeek,
  onTemplates,
  onPrintRota,
  onClearWeek,
  onGenerateRota,
  onPublish,
}: {
  weekLabel: string;
  staffCount: number;
  statusTone: StatusTone;
  statusLabel: string;
  canPublish: boolean;
  onPrevWeek: () => void;
  onPickWeek: () => void;
  onNextWeek: () => void;
  onTemplates: () => void;
  onPrintRota: () => void;
  onClearWeek: () => void;
  onGenerateRota: () => void;
  onPublish: () => void;
}) {
  return (
    <div className="rota-page-header mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="rota-page-title">Rota</h1>
          <span className={`rota-status ${statusTone === "success" ? "green" : "amber"}`}>
            <span className={`dot ${statusTone === "warning" ? "pulse" : ""}`} aria-hidden />
            {statusLabel}
          </span>
        </div>
        <p className="rota-page-subtitle">
          Week of {weekLabel} · Harbour View Hotel · {staffCount} staff
        </p>
      </div>
      <div className="rota-page-actions flex flex-wrap items-center gap-2 lg:justify-end">
        <div className="rota-week-controls" aria-label="Rota week controls">
          <IconButton icon={ChevronLeft} label="Previous week" onClick={onPrevWeek} />
          <FilterButton icon={Calendar} label={weekLabel} onClick={onPickWeek} />
          <IconButton icon={ChevronRight} label="Next week" onClick={onNextWeek} />
        </div>
        <ActionButton variant="outline" size="sm" icon={Sparkles} onClick={onGenerateRota}>
          Generate
        </ActionButton>
        {canPublish && (
          <ActionButton size="sm" icon={Send} onClick={onPublish}>
            Publish
          </ActionButton>
        )}
        <RowActionMenu
          triggerLabel="More rota actions"
          items={[
            { kind: "label", text: "Planning" },
            { label: "Templates", icon: SlidersHorizontal, onSelect: onTemplates },
            { label: "Print rota", icon: Printer, onSelect: onPrintRota },
            { kind: "separator" },
            { label: "Clear week", icon: Eraser, onSelect: onClearWeek, danger: true },
          ]}
        />
      </div>
    </div>
  );
}
