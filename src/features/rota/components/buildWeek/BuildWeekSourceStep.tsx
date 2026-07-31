import * as React from "react";
import { CalendarRange, LayoutTemplate, Rows3, type LucideIcon } from "lucide-react";
import { FormSection } from "@/components/dl";
import type { BuildWeekSourceChoice } from "../../hooks/useBuildWeekProposal";
import type { DemandTemplateSummary } from "../../api/demandTemplates";

/**
 * Step 2 — choose exactly one demand source.
 *
 * Nothing is pre-selected. "No demand source means no generation" is enforced by
 * the shape of the step rather than by a check later: with no choice made there
 * is nothing to continue to.
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
  selected,
  onSelect,
}: {
  templates: DemandTemplateSummary[];
  templatesLoading: boolean;
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

  const patternOptions: SourceOption[] = [
    {
      id: "previous",
      icon: CalendarRange,
      title: "Last week's staffing pattern",
      description:
        "Takes the shape of last week — days, times and roles — and works out who covers it against this week's leave. Assignments are not copied.",
      choice: { kind: "previous-week-pattern" },
    },
    {
      id: "current",
      icon: Rows3,
      title: "This week's existing shifts",
      description:
        "Changes nothing about the week's shape. Suggests who could take the open shifts you already have.",
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
            <p className="text-xs text-muted-foreground">
              No templates yet. Build a representative week, then save its shape from Rota templates
              to reuse it here.
            </p>
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
