import { CalendarPlus, LayoutTemplate, Sparkles } from "lucide-react";
import { ActionButton, FormSection } from "@/components/dl";

/**
 * What Build the Week offers a workspace that has never had a rota.
 *
 * The manager is asked for a shape, not a rota: which shifts the week needs,
 * left Open. Deciding *who* works them is the thing Build is for, and doing it
 * by hand first would waste the feature at the one moment it is most useful.
 *
 * Everything here routes into tooling that already exists — the Add shift
 * drawer creates Open shifts today, and the templates drawer already owns
 * saving a week's shape. This step adds no editor and no second way to create
 * a shift; it explains the gap and points at the door.
 */
export function BuildWeekColdStartStep({
  weekLabel,
  onSketchOpenShifts,
}: {
  weekLabel: string;
  /** Hands over to the existing Add shift drawer, with nothing pre-filled. */
  onSketchOpenShifts?: () => void;
}) {
  return (
    <FormSection
      title="No staffing pattern yet"
      description={`${weekLabel} has no shifts, there is no saved template, and no recent week to copy the shape from.`}
    >
      <div className="rounded-xl border border-border bg-muted/25 p-3">
        <p className="text-sm">
          Docklist cannot know how many people this venue needs on a Tuesday until you show it once.
          Add the shifts the week needs and leave them <strong>Open</strong> — no names.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Then come back to Build this week: it works out who covers each one against
          everybody&apos;s role, leave, days off and hours. You never have to assign the first week
          by hand.
        </p>
      </div>

      <ol className="mt-3 flex flex-col gap-2 text-xs text-muted-foreground">
        <li className="flex items-start gap-2">
          <CalendarPlus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Sketch the week.</strong> Add each shift the venue
            needs, choosing <em>Open shift (no one yet)</em> instead of a person.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Build this week.</strong> The &ldquo;This
            week&apos;s existing shifts&rdquo; source becomes available and fills them.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <LayoutTemplate className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
          <span>
            <strong className="text-foreground">Save the shape.</strong> Keep it as a template so
            every following week starts from it.
          </span>
        </li>
      </ol>

      {onSketchOpenShifts && (
        <ActionButton className="mt-3" icon={CalendarPlus} onClick={onSketchOpenShifts}>
          Sketch open shifts
        </ActionButton>
      )}
    </FormSection>
  );
}
