import * as React from "react";
import { Copy, Eraser, LayoutTemplate, Lightbulb, type LucideIcon } from "lucide-react";
import { DrawerShell, FormSection } from "@/components/dl";

type BuildOption = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  onSelect: () => void;
  disabled?: boolean;
  disabledHint?: string;
};

function OptionRow({ option }: { option: BuildOption }) {
  const Icon = option.icon;
  return (
    <li>
      <button
        type="button"
        onClick={option.onSelect}
        disabled={option.disabled}
        className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition hover:border-brand hover:bg-brand-soft/20 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:border-border disabled:hover:bg-transparent"
      >
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
          <Icon className="h-3.5 w-3.5" aria-hidden />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">{option.title}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {option.disabled && option.disabledHint ? option.disabledHint : option.description}
          </span>
        </span>
      </button>
    </li>
  );
}

/**
 * One entry point for starting a week. Every option runs existing behaviour —
 * the transactional copy-previous-week RPC, the saved demand templates, or a
 * cleared draft — and then hands over to the existing open-shift fill preview.
 * Nothing here publishes; the result is always a manager-reviewed draft.
 */
export function BuildThisWeekDialog({
  open,
  onOpenChange,
  weekLabel,
  openShiftCount,
  plannedShiftCount,
  canEdit,
  onCopyLastWeek,
  onOpenTemplates,
  onClearWeek,
  onFillOpenShifts,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  weekLabel: string;
  openShiftCount: number;
  plannedShiftCount: number;
  canEdit: boolean;
  onCopyLastWeek: () => void;
  onOpenTemplates: () => void;
  onClearWeek: () => void;
  onFillOpenShifts: () => void;
}) {
  const run = React.useCallback(
    (action: () => void) => () => {
      onOpenChange(false);
      action();
    },
    [onOpenChange],
  );

  const sources: BuildOption[] = [
    {
      id: "copy",
      icon: Copy,
      title: "Copy last week",
      description: "Rebuild this week from the previous week's shifts. You review a preview first.",
      onSelect: run(onCopyLastWeek),
      disabled: !canEdit,
      disabledHint: "Available once the live rota has loaded.",
    },
    {
      id: "template",
      icon: LayoutTemplate,
      title: "Apply a rota template",
      description: "Stamp a saved weekly shape onto this week as open shifts, ready to assign.",
      onSelect: run(onOpenTemplates),
    },
    {
      id: "empty",
      icon: Eraser,
      title: "Start with an empty draft",
      description:
        plannedShiftCount > 0
          ? `Clear the ${plannedShiftCount} shift${plannedShiftCount === 1 ? "" : "s"} in this week and build from scratch.`
          : "This week is already empty — add shifts straight into the grid.",
      onSelect: run(onClearWeek),
      disabled: !canEdit || plannedShiftCount === 0,
      disabledHint:
        plannedShiftCount === 0
          ? "This week is already empty — add shifts straight into the grid."
          : "Available once the live rota has loaded.",
    },
  ];

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Build this week"
      description={`Start ${weekLabel} from an existing pattern, then fill what's left. Draft only — staff see nothing until you publish.`}
      width="lg"
    >
      <FormSection
        title="1. Choose a starting point"
        description="Each option writes to the draft only, and you can undo or edit everything afterwards."
      >
        <ul className="flex flex-col gap-2">
          {sources.map((option) => (
            <OptionRow key={option.id} option={option} />
          ))}
        </ul>
      </FormSection>

      <FormSection
        title="2. Fill the open shifts"
        description="Deterministic staffing suggestions for shifts that are still open. You preview them before anything is applied."
      >
        <ul className="flex flex-col gap-2">
          <OptionRow
            option={{
              id: "fill",
              icon: Lightbulb,
              title: "Preview open-shift fill",
              description: `${openShiftCount} open shift${openShiftCount === 1 ? "" : "s"} to suggest staff for. Skips anyone on leave, marked unavailable, on a recurring day off, or already working an overlapping shift.`,
              onSelect: run(onFillOpenShifts),
              disabled: !canEdit || openShiftCount === 0,
              disabledHint: !canEdit
                ? "Available once the live rota has loaded."
                : "No open shifts yet — copy a week or apply a template first.",
            }}
          />
        </ul>
      </FormSection>

      <p className="text-xs text-muted-foreground">
        These are draft staffing suggestions based on roles, leave and availability — not an
        optimised rota. Contracted hours and working-time limits are not modelled, so review the
        week before publishing.
      </p>
    </DrawerShell>
  );
}
