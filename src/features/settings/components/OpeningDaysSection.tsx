import * as React from "react";
import { toast } from "sonner";
import { ActionButton } from "@/components/dl";
import { SectionCard } from "./SettingsPrimitives";
import { useWorkspaceProfile } from "../hooks/useWorkspaceProfile";
import { maskToOpenDays, openDaysToMask, WEEKDAY_SHORT } from "../lib/openingDays";

/**
 * Which weekdays the business is open and its default trading hours. Live for
 * manager workspaces; drives the rota closed-day and out-of-hours warnings.
 * Compact toggles + two time fields — not a form monster.
 */
export function OpeningDaysSection() {
  const profile = useWorkspaceProfile();
  const [draft, setDraft] = React.useState<boolean[] | null>(null);
  const [hours, setHours] = React.useState<{ open: string; close: string } | null>(null);
  const days = draft ?? maskToOpenDays(profile.openWeekdaysMask);
  const dirty = draft !== null;
  const hoursValue = hours ?? { open: profile.openTime ?? "", close: profile.closeTime ?? "" };
  const hoursDirty = hours !== null;

  const toggle = (index: number) => {
    setDraft(days.map((open, i) => (i === index ? !open : open)));
  };

  const handleSave = async () => {
    const result = await profile.saveOpeningDays(openDaysToMask(days));
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setDraft(null);
    toast.success("Opening days saved", {
      description: "The rota now flags shifts on closed days.",
    });
  };

  const handleSaveHours = async () => {
    const open = hoursValue.open.trim();
    const close = hoursValue.close.trim();
    if ((open === "") !== (close === "")) {
      toast.error("Set both times", { description: "Enter an open and a close time, or clear both." });
      return;
    }
    const result = await profile.saveOpeningTimes(open || null, close || null);
    if (!result.ok) {
      toast.error("Not saved", { description: result.message });
      return;
    }
    setHours(null);
    toast.success("Opening hours saved", {
      description: "The rota flags shifts clearly outside these hours.",
    });
  };

  return (
    <SectionCard
      title="Opening days & hours"
      description="The days and hours you trade. The rota warns about shifts on closed days or outside hours."
    >
      <div className="flex flex-wrap gap-1.5">
        {WEEKDAY_SHORT.map((label, index) => {
          const open = days[index];
          return (
            <button
              key={label}
              type="button"
              disabled={!profile.enabled}
              aria-pressed={open}
              onClick={() => toggle(index)}
              className={`h-10 w-12 rounded-xl border text-xs font-semibold transition disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                open
                  ? "border-brand bg-brand-soft/60 text-brand"
                  : "border-border bg-muted/40 text-muted-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {profile.enabled
            ? "Tap a day to toggle open or closed."
            : "Demo workspace — opening days are shown for preview and are not saved."}
        </p>
        <ActionButton
          size="sm"
          onClick={() => void handleSave()}
          disabled={!profile.enabled || !dirty || profile.isSaving}
        >
          Save days
        </ActionButton>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-border/60 pt-4">
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Opens</span>
          <input
            type="time"
            value={hoursValue.open}
            disabled={!profile.enabled}
            onChange={(event) => setHours({ ...hoursValue, open: event.target.value })}
            className="block rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">Closes</span>
          <input
            type="time"
            value={hoursValue.close}
            disabled={!profile.enabled}
            onChange={(event) => setHours({ ...hoursValue, close: event.target.value })}
            className="block rounded-xl border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
          />
        </label>
        <ActionButton
          size="sm"
          variant="secondary"
          onClick={() => void handleSaveHours()}
          disabled={!profile.enabled || !hoursDirty || profile.isSaving}
        >
          Save hours
        </ActionButton>
        <p className="w-full text-[11px] text-muted-foreground">
          Optional. Overnight venues (close before open) skip the out-of-hours check.
        </p>
      </div>
    </SectionCard>
  );
}
