import { CalendarX } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import type { AvailabilityConstraintClash } from "../lib/availabilityConstraints";

export function AvailabilityConstraintClashesCard({
  clashes,
  onReviewShift,
}: {
  clashes: AvailabilityConstraintClash[];
  onReviewShift: (shiftId: string) => void;
}) {
  if (clashes.length === 0) return null;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center gap-2">
        <CalendarX className="size-4 text-warning" aria-hidden />
        <span className="text-sm font-semibold">Availability clashes</span>
        <span className="badge">{clashes.length}</span>
      </div>
      <p className="mb-2.5 text-[11px] text-muted-foreground">
        These shifts override approved unavailability or recurring days off. Review them before
        publishing; a manager can publish only after acknowledging the warning.
      </p>
      <ul className="space-y-1.5">
        {clashes.map((clash) => (
          <li key={clash.shiftId} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              <span className="font-medium">{clash.staffName}</span> · {clash.dayLabel}
            </span>
            <StatusBadge tone="warning">
              {clash.kind === "unavailable" ? "Unavailable" : "Day off"}
            </StatusBadge>
            <button
              type="button"
              onClick={() => onReviewShift(clash.shiftId)}
              className="shrink-0 rounded px-1 font-semibold text-brand hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Review
            </button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
