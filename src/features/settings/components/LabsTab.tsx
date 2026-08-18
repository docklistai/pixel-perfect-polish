import { FlaskConical, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { AlertCard } from "@/components/dl";
import { SectionCard, PreviewTag } from "./SettingsPrimitives";
import { LabsToggleRow } from "./LabsToggleRow";
import { useSaveWorkspaceLabs, useWorkspaceLabs } from "../hooks/useWorkspaceLabs";

/**
 * Labs — experimental features, off by default, decided per workspace.
 *
 * Every control on this tab persists, because the tab is pilot-visible and the
 * pilot must never offer a switch that silently does nothing.
 *
 * This tab lists capabilities that exist, and nothing else. A rejected or
 * unbuilt idea gets no entry at all — not a disabled toggle, not a "coming
 * soon" card — because naming it here would advertise a roadmap the product has
 * not committed to. Predictive absence in particular is permanently dropped and
 * must not reappear on this surface in any form.
 */
export function LabsTab() {
  const labs = useWorkspaceLabs();
  const save = useSaveWorkspaceLabs();

  const setTimePulse = (next: boolean) => {
    save.mutate(
      { timePulse: next },
      {
        onSuccess: () =>
          toast.success(next ? "Time Pulse turned on" : "Time Pulse turned off", {
            description: next
              ? "Live attendance now appears on Home for managers."
              : "Home no longer reads or shows live attendance.",
          }),
        onError: (error: Error) =>
          toast.error("Labs not updated", {
            description: error.message || "We couldn't save that change. Please try again.",
          }),
      },
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Labs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Experimental features for this workspace. They are off until you turn them on, they can
          change or be withdrawn, and each one is listed with exactly what it does.
        </p>
      </div>

      {labs.isError && (
        <AlertCard
          tone="warning"
          title="We couldn't load your Labs settings"
          description="Experiments are shown as off until the setting can be read again. Nothing has changed for your workspace."
        />
      )}

      <SectionCard
        title="Time Pulse"
        description="A read-only live attendance board on Home."
        badge={<PreviewTag>Experimental</PreviewTag>}
      >
        <div className="space-y-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Shows who is scheduled right now and what the clock data says about each of them — on
            site, on break, checked out, or not clocked in yet. It reads your published rota and
            existing clock records only. It never changes a shift, a timesheet, or a clock entry,
            and it never stores a judgement about anyone.
          </p>
          <LabsToggleRow
            label="Show Time Pulse on Home"
            description="Managers and owners only. Off by default."
            ariaLabel="Show Time Pulse on Home"
            on={labs.flags.timePulse}
            onToggle={setTimePulse}
            pending={save.isPending}
            disabled={!labs.enabled || labs.isLoading || labs.isError}
          />
        </div>
      </SectionCard>

      <SectionCard title="What Labs will not do" description="Fixed bounds for every experiment.">
        <ul className="space-y-2.5">
          {[
            "Experiments are off until you turn them on, and off means nothing runs.",
            "Nothing here scores, ranks, or profiles a member of your team.",
            "Read-only experiments never publish, approve, or change your data.",
            "Staff never see Labs, and Labs never adds anything to what staff can see.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="flex items-start gap-2.5 px-1 text-xs text-muted-foreground">
        <FlaskConical className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Labs settings apply to your whole workspace, not just to you. Any owner or manager can
          change them.
        </span>
      </div>
    </div>
  );
}
