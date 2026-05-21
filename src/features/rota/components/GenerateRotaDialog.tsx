import * as React from "react";
import { CalendarPlus } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";
import { fillOpenShiftsWithSuggestions } from "../lib/draftRota";
import type { DraftShift, StaffMember } from "../types";

export function GenerateRotaDialog({
  open,
  onOpenChange,
  weekLabel,
  days,
  shifts,
  staff,
  onApplySuggestions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekLabel: string;
  days: { d: string }[];
  shifts: DraftShift[];
  staff: StaffMember[];
  onApplySuggestions: () => void;
}) {
  const { suggestions } = React.useMemo(
    () => fillOpenShiftsWithSuggestions(shifts, staff),
    [shifts, staff],
  );
  const canApply = suggestions.length > 0;

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Fill open shifts"
      description={`Review suggested staff for open shifts in the week of ${weekLabel}.`}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            icon={CalendarPlus}
            disabled={!canApply}
            onClick={() => {
              onApplySuggestions();
              onOpenChange(false);
            }}
            title={
              canApply ? "Fill open shifts in the current draft." : "No open shifts can be filled."
            }
          >
            Fill open shifts
          </ActionButton>
        </>
      }
    >
      <FormSection title="How it works">
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">Suggested assignments</span>
            <StatusBadge tone="muted">Preview</StatusBadge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Suggestions match the role first, then prefer staff with fewer assigned shifts this
            week.
          </p>
        </div>
      </FormSection>

      <FormSection title={suggestions.length > 0 ? "Suggested fills" : "Nothing to fill"}>
        {suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.shiftId}
                className="rounded-xl border border-border bg-muted/20 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">{suggestion.staffName}</span>
                  <StatusBadge tone="success">Suggested</StatusBadge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {suggestion.role} on{" "}
                  {days[suggestion.dayIndex]?.d ?? `day ${suggestion.dayIndex + 1}`} ·{" "}
                  {suggestion.reason}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            No suggestions are available for the current open shifts.
          </p>
        )}
      </FormSection>
    </DialogShell>
  );
}
