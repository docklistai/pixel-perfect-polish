import * as React from "react";
import { Copy } from "lucide-react";
import { ActionButton } from "@/components/dl";
import type { RepeatShiftResult } from "../lib/repeatShift";

type DayEntry = { d: string };

export function RepeatShiftControls({
  sourceDayIndex,
  days,
  disabled,
  onActiveChange,
  onBusyChange,
  onRepeat,
  onSuccess,
}: {
  sourceDayIndex: number;
  days: DayEntry[];
  disabled: boolean;
  onActiveChange: (active: boolean) => void;
  onBusyChange: (busy: boolean) => void;
  onRepeat: (dayIndexes: number[]) => Promise<RepeatShiftResult | null>;
  onSuccess: () => void;
}) {
  const [active, setActive] = React.useState(false);
  const [selectedDays, setSelectedDays] = React.useState<Set<number>>(new Set());
  const [feedback, setFeedback] = React.useState("");

  const setRepeatActive = (next: boolean) => {
    setActive(next);
    onActiveChange(next);
    if (!next) {
      setSelectedDays(new Set());
      setFeedback("");
    }
  };

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((current) => {
      const next = new Set(current);
      if (next.has(dayIndex)) next.delete(dayIndex);
      else next.add(dayIndex);
      return next;
    });
    setFeedback("");
  };

  const submit = async () => {
    if (selectedDays.size === 0) return;
    onBusyChange(true);
    let shouldClose = false;
    try {
      const result = await onRepeat(Array.from(selectedDays));
      if (result && result.successCount > 0) {
        shouldClose = true;
      } else {
        setFeedback(
          result?.failedCount
            ? "No copies were created. Check the save error and try again."
            : "No copies were created because the selected days already contain matching shifts.",
        );
      }
    } catch {
      setFeedback("No copies were created. Check the save error and try again.");
    } finally {
      onBusyChange(false);
    }
    if (shouldClose) onSuccess();
  };

  if (!active) {
    return (
      <ActionButton
        variant="secondary"
        size="sm"
        icon={Copy}
        disabled={disabled}
        onClick={() => setRepeatActive(true)}
      >
        Repeat shift...
      </ActionButton>
    );
  }

  return (
    <div className="mt-3 w-full rounded-xl border border-border bg-muted/20 p-3">
      <div className="mb-2 text-sm font-semibold text-foreground">Repeat this shift on:</div>
      <div className="flex flex-wrap gap-2">
        {days.map((day, dayIndex) => {
          const isSource = sourceDayIndex === dayIndex;
          const isSelected = selectedDays.has(dayIndex);
          return (
            <label
              key={dayIndex}
              className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                isSource
                  ? "cursor-not-allowed border-transparent text-muted-foreground opacity-50"
                  : isSelected
                    ? "cursor-pointer border-brand bg-brand/5 text-brand"
                    : "cursor-pointer border-border bg-background text-foreground hover:border-brand/30"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                disabled={isSource || disabled}
                checked={isSource || isSelected}
                onChange={() => toggleDay(dayIndex)}
              />
              {day.d}
            </label>
          );
        })}
      </div>
      {feedback && (
        <p className="mt-3 text-xs text-danger" role="status" aria-live="polite">
          {feedback}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2">
        <ActionButton
          variant="ghost"
          size="sm"
          onClick={() => setRepeatActive(false)}
          disabled={disabled}
        >
          Cancel
        </ActionButton>
        <ActionButton
          size="sm"
          disabled={selectedDays.size === 0 || disabled}
          onClick={() => void submit()}
        >
          Confirm repeat
        </ActionButton>
      </div>
    </div>
  );
}
