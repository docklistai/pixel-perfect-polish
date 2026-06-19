import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useWorkspaceSelector, useWorkspaceStore } from "@/features/demo/store/useWorkspaceStore";
import { selectRotaWeek } from "@/features/demo/store/workspaceActions";
import { getWeekLabelForOffset, getWeekSubtitle } from "./topbarUtils";

export function TopbarWeekPill() {
  const store = useWorkspaceStore();
  const weekOffset = useWorkspaceSelector((state) => state.weekOffset);
  const weekLabel = getWeekLabelForOffset(weekOffset);

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

      <div className="topbar-pill date pointer-events-none select-none hidden md:flex">
        <Calendar className="ico h-4 w-4" style={{ color: "var(--st-teal-ink)" }} aria-hidden />
        <div className="stack">
          <div className="text-sm font-semibold" suppressHydrationWarning>
            {weekLabel}
          </div>
          <small>{getWeekSubtitle(weekOffset)}</small>
        </div>
      </div>

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
