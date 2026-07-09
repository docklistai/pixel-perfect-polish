import * as React from "react";
import { toast } from "sonner";
import { ActionButton, DrawerShell, FormSection } from "@/components/dl";
import { useCopyRotaDay } from "../hooks/useCopyRotaDay";

/**
 * Copy one day's shifts onto other days of the same draft week — a fast way to
 * build a repeating weekday pattern — or clear a whole day in one action.
 */
export function CopyDayDialog({
  open,
  onOpenChange,
  rotaWeekId,
  dayLabels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Current live draft week, or null when there is nothing to copy within. */
  rotaWeekId: string | null;
  /** Seven Mon..Sun day labels for the current week. */
  dayLabels: string[];
}) {
  const { copy, clear, isCopying, isClearing } = useCopyRotaDay();
  const [from, setFrom] = React.useState(0);
  const [targets, setTargets] = React.useState<Set<number>>(new Set());
  const [clearDay, setClearDay] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (open) {
      setFrom(0);
      setTargets(new Set());
      setClearDay(null);
    }
  }, [open]);

  const handleClear = async () => {
    if (!rotaWeekId || clearDay === null) return;
    const result = await clear(rotaWeekId, clearDay);
    if (!result.ok) {
      toast.error("Couldn't clear the day", { description: result.message });
      return;
    }
    setClearDay(null);
    toast.success("Day cleared", {
      description:
        result.shiftsRemoved > 0
          ? `Removed ${result.shiftsRemoved} shift${result.shiftsRemoved === 1 ? "" : "s"}.`
          : "That day had no shifts.",
    });
  };

  const toggleTarget = (day: number) => {
    setTargets((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const handleCopy = async () => {
    if (!rotaWeekId) return;
    const toWeekdays = [...targets].filter((day) => day !== from);
    if (toWeekdays.length === 0) {
      toast.error("Pick target days", { description: "Choose at least one day to copy onto." });
      return;
    }
    const result = await copy(rotaWeekId, from, toWeekdays);
    if (!result.ok) {
      toast.error("Couldn't copy the day", { description: result.message });
      return;
    }
    onOpenChange(false);
    toast.success("Day copied", {
      description:
        result.shiftsCreated > 0
          ? `Added ${result.shiftsCreated} shift${result.shiftsCreated === 1 ? "" : "s"}. Review before publishing.`
          : "That day had no shifts to copy.",
    });
  };

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Copy or clear a day"
      description="Copy one day's shifts onto other days of this week, or clear a whole day. Copying adds to the target days — it doesn't clear them."
      width="lg"
      footer={
        <ActionButton onClick={() => void handleCopy()} disabled={!rotaWeekId || isCopying}>
          {isCopying ? "Copying…" : "Copy day"}
        </ActionButton>
      }
    >
      {!rotaWeekId ? (
        <p className="text-sm text-muted-foreground">Open a live draft week to copy a day.</p>
      ) : (
        <>
          <FormSection title="Copy from">
            <div className="grid grid-cols-7 gap-1.5">
              {dayLabels.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={from === day}
                  onClick={() => setFrom(day)}
                  className={`rounded-xl border px-0 py-2 text-[11px] font-semibold transition ${
                    from === day
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  {label.split(" ")[0]}
                </button>
              ))}
            </div>
          </FormSection>
          <FormSection title="Copy onto">
            <div className="grid grid-cols-7 gap-1.5">
              {dayLabels.map((label, day) => {
                const isSource = day === from;
                const on = targets.has(day) && !isSource;
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isSource}
                    aria-pressed={on}
                    onClick={() => toggleTarget(day)}
                    className={`rounded-xl border px-0 py-2 text-[11px] font-semibold transition disabled:opacity-30 ${
                      on
                        ? "border-brand bg-brand-soft/60 text-brand"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    {label.split(" ")[0]}
                  </button>
                );
              })}
            </div>
          </FormSection>
          <FormSection title="Clear a day">
            <div className="grid grid-cols-7 gap-1.5">
              {dayLabels.map((label, day) => (
                <button
                  key={day}
                  type="button"
                  aria-pressed={clearDay === day}
                  onClick={() => setClearDay(clearDay === day ? null : day)}
                  className={`rounded-xl border px-0 py-2 text-[11px] font-semibold transition ${
                    clearDay === day
                      ? "border-danger bg-danger-soft/60 text-danger"
                      : "border-border bg-card hover:bg-muted/50"
                  }`}
                >
                  {label.split(" ")[0]}
                </button>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-[11px] text-muted-foreground">
                Removes every shift on the selected day. This can&apos;t be undone.
              </p>
              <ActionButton
                size="sm"
                variant="secondary"
                onClick={() => void handleClear()}
                disabled={clearDay === null || isClearing}
              >
                {isClearing ? "Clearing…" : "Clear day"}
              </ActionButton>
            </div>
          </FormSection>
        </>
      )}
    </DrawerShell>
  );
}
