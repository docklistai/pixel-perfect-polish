import { Copy, Filter, Plus, Sparkles } from "lucide-react";
import { ActionButton, IconButton } from "@/components/dl";

export function RotaGridToolbar({
  conflictCount,
  openShiftCount,
  coveragePct,
  onFilter,
  onGenerateRota,
  onAddShift,
  onViewConflicts,
  onCopyLastWeek,
}: {
  conflictCount: number;
  openShiftCount: number;
  coveragePct: number;
  onFilter: () => void;
  onGenerateRota: () => void;
  onAddShift: () => void;
  onViewConflicts: () => void;
  onCopyLastWeek: () => void;
}) {
  const coverageTone = coveragePct > 110 ? "warning" : coveragePct >= 95 ? "success" : "warning";

  return (
    <div className="rota-grid-toolbar flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
      <ActionButton variant="secondary" size="sm" icon={Filter} onClick={onFilter}>
        Filter
      </ActionButton>

      <span className="rota-toolbar-separator hidden sm:block" aria-hidden />

      <div className="rota-toolbar-statuses hidden flex-wrap items-center gap-1.5 sm:flex">
        <button
          type="button"
          onClick={conflictCount > 0 ? onViewConflicts : undefined}
          className={`rota-toolbar-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition ${
            conflictCount > 0
              ? "cursor-pointer bg-danger-soft text-danger hover:bg-danger-soft/80"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${conflictCount > 0 ? "bg-danger" : "bg-muted-foreground"}`}
            aria-hidden
          />
          {conflictCount} {conflictCount === 1 ? "conflict" : "conflicts"}
        </button>

        <button
          type="button"
          onClick={openShiftCount > 0 ? onViewConflicts : undefined}
          className={`rota-toolbar-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition ${
            openShiftCount > 0
              ? "cursor-pointer bg-warning-soft text-warning-700 hover:bg-warning-soft/80"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${openShiftCount > 0 ? "bg-warning" : "bg-muted-foreground"}`}
            aria-hidden
          />
          {openShiftCount} open
        </button>

        <span
          className={`rota-toolbar-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none ${
            coverageTone === "success"
              ? "bg-success-soft text-success"
              : "bg-warning-soft text-warning-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${coverageTone === "success" ? "bg-success" : "bg-warning"}`}
            aria-hidden
          />
          {coveragePct}% coverage
        </span>
      </div>

      <div className="rota-toolbar-actions ml-auto flex flex-wrap items-center gap-2">
        <ActionButton variant="secondary" size="sm" icon={Copy} onClick={onCopyLastWeek}>
          Copy last week
        </ActionButton>
        <ActionButton variant="outline" size="sm" icon={Sparkles} onClick={onGenerateRota}>
          Generate
        </ActionButton>
        <IconButton icon={Plus} label="Add shift" onClick={onAddShift} />
      </div>
    </div>
  );
}
