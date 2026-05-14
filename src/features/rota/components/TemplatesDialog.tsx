import * as React from "react";
import { CalendarDays } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

const templates = [
  {
    name: "Standard cover",
    coverage: "Balanced weekday and weekend cover",
    detail: "Resets the draft to the built-in standard week pattern.",
    actionable: true,
  },
  {
    name: "Weekend-heavy",
    coverage: "Extra Friday to Sunday cover",
    detail: "Useful when occupancy or bookings make weekend service the pressure point.",
    actionable: false,
  },
  {
    name: "Lean weekday cover",
    coverage: "Lower weekday hours",
    detail: "Keeps essential roles covered while reducing quiet-period staffing.",
    actionable: false,
  },
];

export function TemplatesDialog({
  open,
  onOpenChange,
  onApplyStandardTemplate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyStandardTemplate: () => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = React.useState(templates[0].name);
  const selectedTemplateData =
    templates.find((template) => template.name === selectedTemplate) ?? templates[0];

  React.useEffect(() => {
    if (open) setSelectedTemplate(templates[0].name);
  }, [open]);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota templates"
      description="Preview scheduling patterns. Only the standard cover template is wired to local draft editing."
      size="lg"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton
            disabled={!selectedTemplateData.actionable}
            title={
              selectedTemplateData.actionable
                ? "Apply the built-in standard cover template to this draft."
                : "Only the standard cover template is wired to local draft editing."
            }
            onClick={() => {
              onApplyStandardTemplate();
              onOpenChange(false);
            }}
          >
            Apply standard cover
          </ActionButton>
        </>
      }
    >
      <FormSection title="Template library">
        <div className="grid gap-3 sm:grid-cols-3">
          {templates.map((template) => {
            const isSelected = selectedTemplate === template.name;

            return (
              <button
                key={template.name}
                type="button"
                onClick={() => setSelectedTemplate(template.name)}
                className="rounded-xl border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex items-center justify-between gap-2">
                  <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
                  {isSelected && <StatusBadge tone="success">Preview</StatusBadge>}
                  {!template.actionable && !isSelected && (
                    <StatusBadge tone="muted">Later</StatusBadge>
                  )}
                </span>
                <span className="mt-3 block text-sm font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {template.coverage}
                </span>
              </button>
            );
          })}
        </div>
      </FormSection>

      <div className="rounded-xl border border-border bg-muted/30 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{selectedTemplate}</div>
          <StatusBadge tone={selectedTemplateData.actionable ? "success" : "muted"}>
            {selectedTemplateData.actionable ? "Can apply" : "Later"}
          </StatusBadge>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{selectedTemplateData.detail}</p>
        {!selectedTemplateData.actionable && (
          <p className="mt-2 text-xs text-muted-foreground">
            The preview is local only. Standard cover is the only wired template in this pass.
          </p>
        )}
      </div>
    </DialogShell>
  );
}
