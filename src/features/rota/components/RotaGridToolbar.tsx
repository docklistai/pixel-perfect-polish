import { Copy, Filter, Keyboard, Plus, Redo2, Sparkles, Undo2 } from "lucide-react";
import { ActionButton, IconButton } from "@/components/dl";

export function RotaGridToolbar({
  conflictCount,
  openShiftCount,
  workingTimeAlertCount,
  coveragePct,
  onFilter,
  onGenerateRota,
  onAddShift,
  onViewConflicts,
  onViewWorkingTime,
  onCopyLastWeek,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}: {
  conflictCount: number;
  openShiftCount: number;
  workingTimeAlertCount: number;
  coveragePct: number;
  onFilter: () => void;
  onGenerateRota: () => void;
  onAddShift: () => void;
  onViewConflicts: () => void;
  onViewWorkingTime: () => void;
  onCopyLastWeek: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const coverageTone = coveragePct > 110 ? "warning" : coveragePct >= 95 ? "success" : "warning";

  return (
    <>
      <div className="rota-grid-toolbar flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5">
        <ActionButton variant="secondary" size="sm" icon={Filter} onClick={onFilter}>
          Filter
        </ActionButton>

        <IconButton
          icon={Undo2}
          label="Undo"
          size="sm"
          variant="ghost"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl/Cmd+Z)"
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          size="sm"
          variant="ghost"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl/Cmd+Shift+Z)"
        />

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

          <button
            type="button"
            onClick={workingTimeAlertCount > 0 ? onViewWorkingTime : undefined}
            title="Working-time alerts — rest breaks and weekly limits"
            className={`rota-toolbar-chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold leading-none transition ${
              workingTimeAlertCount > 0
                ? "cursor-pointer bg-accent-purple-soft text-accent-purple hover:bg-accent-purple-soft/80"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                workingTimeAlertCount > 0 ? "bg-accent-purple" : "bg-muted-foreground"
              }`}
              aria-hidden
            />
            {workingTimeAlertCount} working time
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
          <ActionButton
            className="rota-toolbar-copy"
            variant="secondary"
            size="sm"
            icon={Copy}
            onClick={onCopyLastWeek}
          >
            Copy last week
          </ActionButton>
          <ActionButton
            variant="outline"
            size="sm"
            icon={Sparkles}
            onClick={onGenerateRota}
            disabled={openShiftCount === 0}
            title={
              openShiftCount === 0
                ? "No open shifts to fill yet — add open shifts, or use Copy last week to start."
                : "Suggest a colleague for every open shift (draft only, never auto-published)"
            }
          >
            Fill open shifts
          </ActionButton>
          <IconButton icon={Plus} label="Add shift" onClick={onAddShift} />
        </div>
      </div>
      <div
        className="hidden items-center gap-2 border-b border-border bg-muted/25 px-4 py-2 text-[10px] text-muted-foreground md:flex"
        role="note"
        aria-label="Rota keyboard shortcuts"
      >
        <Keyboard className="h-3 w-3" aria-hidden />
        <span>Arrow keys navigate</span>
        <span className="h-3 w-px bg-border" aria-hidden />
        <kbd className="kbd">Enter</kbd>
        <span>details</span>
        <kbd className="kbd">F2</kbd>
        <span>edit</span>
        <kbd className="kbd">M</kbd>
        <span>menu</span>
        <kbd className="kbd">Esc</kbd>
        <span>cancel</span>
      </div>
    </>
  );
}
