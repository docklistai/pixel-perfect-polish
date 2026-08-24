import * as React from "react";
import { CalendarRange, LayoutTemplate, Rows3, type LucideIcon } from "lucide-react";
import { ActionButton, FormSection } from "@/components/dl";
import type { BuildWeekSourceChoice } from "../../hooks/useBuildWeekProposal";
import type { DemandTemplateSummary } from "../../api/demandTemplates";
import type { PreviousPatternAvailability } from "../../api/buildWeekSources";

/**
 * Step 2 — choose exactly one demand source.
 *
 * Nothing is pre-selected. "No demand source means no generation" is enforced by
 * the shape of the step rather than by a check later: with no choice made there
 * is nothing to continue to.
 *
 * Every source states whether it can actually be used BEFORE it is chosen. A
 * source that would refuse is shown disabled with the reason in place of its
 * description, so a manager never spends a build to be told their rota has
 * nothing to build from.
 */

type SourceOption = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  choice: BuildWeekSourceChoice;
  disabled?: boolean;
  disabledHint?: string;
};

function OptionRow({
  option,
  selected,
  onSelect,
}: {
  option: SourceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = option.icon;
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        disabled={option.disabled}
        aria-pressed={selected}
        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 ${
          selected
            ? "border-brand bg-brand-soft/25"
            : "border-border hover:border-brand hover:bg-brand-soft/20"
        }`}
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

export function BuildWeekSourceStep({
  templates,
  templatesLoading,
  previousPattern,
  sourcesLoading,
  canSaveTemplate,
  onSaveTemplate,
  selected,
  onSelect,
}: {
  templates: DemandTemplateSummary[];
  templatesLoading: boolean;
  /** Null while unknown; the option stays disabled until it is answered. */
  previousPattern: PreviousPatternAvailability | null;
  sourcesLoading: boolean;
  /** This week has a shape worth keeping, so offering to save it is honest. */
  canSaveTemplate: boolean;
  onSaveTemplate?: () => void;
  selected: BuildWeekSourceChoice | null;
  onSelect: (choice: BuildWeekSourceChoice) => void;
}) {
  const isSelected = (choice: BuildWeekSourceChoice) => {
    if (!selected || selected.kind !== choice.kind) return false;
    if (choice.kind === "template" && selected.kind === "template") {
      return selected.templateId === choice.templateId;
    }
    return true;
  };

  // The pattern option names the week it would actually use. With the search
  // looking back up to four weeks, calling it "last week" would sometimes lie.
  const patternAvailable = previousPattern?.available === true;
  const patternTitle = patternAvailable
    ? `Staffing pattern from ${previousPattern.weekLabel}`
    : "Recent staffing pattern";
  const patternDescription = patternAvailable
    ? `Takes the shape of ${previousPattern.weekLabel} — ${previousPattern.shiftCount} shift${
        previousPattern.shiftCount === 1 ? "" : "s"
      }, their days, times and roles — and works out who covers it against this week's leave. Assignments are not copied.`
    : "Takes the shape of a recent week — days, times and roles — and works out who covers it against this week's leave. Assignments are not copied.";

  const patternOptions: SourceOption[] = [
    {
      id: "previous",
      icon: CalendarRange,
      title: patternTitle,
      description: patternDescription,
      choice: { kind: "previous-week-pattern" },
      disabled: !patternAvailable,
      disabledHint: sourcesLoading
        ? "Checking which recent weeks have shifts…"
        : previousPattern && !previousPattern.available
          ? previousPattern.reason
          : "Checking which recent weeks have shifts…",
    },
    {
      id: "current",
      icon: Rows3,
      title: "This week's existing shifts",
      description:
        "Changes nothing about the week's shape. Fills the eligible Open shifts you already have, and creates no new demand.",
      choice: { kind: "current-week" },
    },
  ];

  return (
    <>
      <FormSection
        title="2. Choose what this week needs"
        description="Pick one source. Build creates only what is missing from it — it never removes a shift you already have."
      >
        <ul className="flex flex-col gap-2">
          {patternOptions.map((option) => (
            <OptionRow
              key={option.id}
              option={option}
              selected={isSelected(option.choice)}
              onSelect={() => onSelect(option.choice)}
            />
          ))}
        </ul>
      </FormSection>

      <FormSection
        title="Or use a saved template"
        description="Templates describe the coverage a week needs, not who works it."
      >
        {templatesLoading ? (
          <p className="text-sm text-muted-foreground">Loading templates…</p>
        ) : templates.length === 0 ? (
          <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/25 p-3">
            <LayoutTemplate className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                No template has been saved yet. A template describes the coverage a week needs, so
                it can be stamped onto any future week.
              </p>
              {canSaveTemplate && onSaveTemplate && (
                <ActionButton
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  icon={LayoutTemplate}
                  onClick={onSaveTemplate}
                >
                  Save this week's shape
                </ActionButton>
              )}
            </div>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {templates.map((template) => (
              <OptionRow
                key={template.id}
                option={{
                  id: template.id,
                  icon: LayoutTemplate,
                  title: template.name,
                  description: `${template.totalShifts} shift${template.totalShifts === 1 ? "" : "s"} across ${template.dayCount} day${template.dayCount === 1 ? "" : "s"}${template.notes ? ` · ${template.notes}` : ""}`,
                  choice: { kind: "template", templateId: template.id, label: template.name },
                }}
                selected={isSelected({
                  kind: "template",
                  templateId: template.id,
                  label: template.name,
                })}
                onSelect={() =>
                  onSelect({ kind: "template", templateId: template.id, label: template.name })
                }
              />
            ))}
          </ul>
        )}
      </FormSection>
    </>
  );
}
