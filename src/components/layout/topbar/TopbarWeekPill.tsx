import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { selectRotaWeek } from "@/features/demo/store/workspaceActions";
import { getWeekLabelForOffset, getWeekSubtitle } from "./topbarUtils";
import { WeekPickerDialog } from "@/features/rota/components/WeekPickerDialog";
import * as React from "react";

export function TopbarWeekPill({ displayedWeekLabel }: { displayedWeekLabel?: string }) {
  const store = useWorkspaceStore();
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekLabel = displayedWeekLabel ?? getWeekLabelForOffset(weekOffset);
  const [pickerOpen, setPickerOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => selectRotaWeek(store, weekOffset - 1)}
        className="topbar-arrow"
        title="Previous week"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="topbar-pill date select-none hidden md:flex hover:bg-muted/50 cursor-pointer text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Calendar className="ico h-4 w-4" style={{ color: "var(--st-teal-ink)" }} aria-hidden />
        <div className="stack">
          <div className="text-sm font-semibold" suppressHydrationWarning>
            {weekLabel}
          </div>
          <small>{getWeekSubtitle(weekOffset)}</small>
        </div>
      </button>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="topbar-arrow md:hidden"
        title="Choose rota week"
        aria-label="Choose rota week"
      >
        <Calendar className="h-4 w-4" aria-hidden />
      </button>

      <WeekPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        weekLabel={weekLabel}
        onSelectOffset={(val) => {
          if (typeof val === "function") {
            selectRotaWeek(store, val(weekOffset));
          } else {
            selectRotaWeek(store, val);
          }
        }}
      />

      <button
        type="button"
        onClick={() => selectRotaWeek(store, weekOffset + 1)}
        className="topbar-arrow"
        title="Next week"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </>
  );
}
