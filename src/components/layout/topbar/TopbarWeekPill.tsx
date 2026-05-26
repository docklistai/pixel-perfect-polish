import * as React from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { getWeekLabelForOffset, getWeekSubtitle } from "./topbarUtils";

export function TopbarWeekPill() {
  const [weekOffset, setWeekOffset] = React.useState(0);
  const weekLabel = getWeekLabelForOffset(weekOffset);

  return (
    <div className="hidden flex-1 justify-center items-center gap-1.5 md:flex select-none">
      <button
        type="button"
        onClick={() => setWeekOffset((prev) => prev - 1)}
        className="topbar-arrow"
        title="Previous week"
        aria-label="Previous week"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="topbar-pill date pointer-events-none select-none">
        <Calendar className="ico h-4 w-4" style={{ color: "var(--st-teal-ink)" }} aria-hidden />
        <div className="stack items-center">
          <div className="text-sm font-semibold" suppressHydrationWarning>
            {weekLabel}
          </div>
          <small>{getWeekSubtitle(weekOffset)}</small>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setWeekOffset((prev) => prev + 1)}
        className="topbar-arrow"
        title="Next week"
        aria-label="Next week"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
