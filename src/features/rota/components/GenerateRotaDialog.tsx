import * as React from "react";
import { Check, Info, Lightbulb, RotateCcw, X } from "lucide-react";
import { ActionButton, DrawerShell, FormSection } from "@/components/dl";
import { fillOpenShiftsWithSuggestions } from "../lib/rotaSuggestions";
import type { DraftShift, StaffMember } from "../types";
import type { MaybePromise } from "./grid";
import type { LeaveRequest } from "@/features/leave/types";

export function GenerateRotaDialog({
  open,
  onOpenChange,
  weekLabel,
  shifts,
  staff,
  leaveRequests,
  dayIsoDates,
  onApplySuggestions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekLabel: string;
  days?: unknown;
  shifts: DraftShift[];
  staff: StaffMember[];
  leaveRequests: LeaveRequest[];
  dayIsoDates: string[];
  onApplySuggestions: () => MaybePromise<void>;
}) {
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const preview = React.useMemo(
    () => fillOpenShiftsWithSuggestions(shifts, staff, { leaveRequests, dayIsoDates }),
    [dayIsoDates, leaveRequests, shifts, staff],
  );

  React.useEffect(() => {
    if (!open) setPreviewOpen(false);
  }, [open]);

  const applyPreview = async () => {
    await onApplySuggestions();
    onOpenChange(false);
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Preview open-shift fill"
      description={`Draft-only suggestions for ${weekLabel}. Nothing publishes automatically.`}
      width="lg"
      footer={
        <>
          <ActionButton variant="ghost" icon={X} onClick={() => onOpenChange(false)}>
            Discard
          </ActionButton>
          {!previewOpen ? (
            <ActionButton icon={Lightbulb} onClick={() => setPreviewOpen(true)}>
              Preview suggestions
            </ActionButton>
          ) : (
            <ActionButton
              icon={Check}
              disabled={preview.suggestions.length === 0}
              onClick={() => void applyPreview()}
            >
              Apply to draft
            </ActionButton>
          )}
        </>
      }
    >
      <FormSection title="What this does">
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {[
            "Only fills shifts that are currently open.",
            "Assigns a colleague whose role matches the shift.",
            "Prefers people with fewer shifts already this week.",
            "Never double-books anyone on the same day.",
            "Leaves your existing assignments untouched.",
            "Keeps the result as a manager-reviewed draft until you publish.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </FormSection>

      {previewOpen && (
        <FormSection
          title="Preview"
          description={
            preview.suggestions.length > 0
              ? "Review these draft assignments before applying them."
              : "No role-matched open shifts can be filled from the current staff list."
          }
        >
          {preview.suggestions.length > 0 ? (
            <ul className="flex flex-col gap-2 text-sm">
              {preview.suggestions.map((suggestion) => (
                <li
                  key={suggestion.shiftId}
                  className="rounded-lg border border-border bg-muted/25 p-2"
                >
                  <div className="font-medium">
                    {suggestion.role} - day {suggestion.dayIndex + 1}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Assign to {suggestion.staffName} - {suggestion.reason}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-lg border border-border bg-muted/25 p-3 text-sm text-muted-foreground">
              Add open shifts with matching active staff, or adjust the roles before trying again.
            </div>
          )}
        </FormSection>
      )}

      <div
        className="flex items-start gap-3 rounded-lg border p-3"
        style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden />
        </div>
        <div className="grow">
          <div className="text-sm font-semibold text-brand">Manager review required</div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            These are suggestions, not a finished rota. They avoid already-scheduled same-day
            assignments and demo leave clashes where that data is loaded, but they do not guarantee
            availability, rest gaps, or contracted-hour limits. Staff see nothing until you publish.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        {previewOpen ? (
          <RotateCcw className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        ) : (
          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        )}
        <span>To start from a past week instead, close this and use Copy last week.</span>
      </div>
    </DrawerShell>
  );
}
