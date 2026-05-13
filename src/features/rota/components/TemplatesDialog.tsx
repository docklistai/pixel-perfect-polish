import * as React from "react";
import { CalendarDays } from "lucide-react";
import { ActionButton, DialogShell, FormSection, StatusBadge } from "@/components/dl";

const templates = [
  {
    name: "Standard week",
    coverage: "Balanced weekday and weekend cover",
    detail: "Keeps current role mix and fills the week around normal service levels.",
  },
  {
    name: "Weekend-heavy",
    coverage: "Extra Friday to Sunday cover",
    detail: "Useful when occupancy or bookings make weekend service the pressure point.",
  },
  {
    name: "Lean weekday cover",
    coverage: "Lower weekday hours",
    detail: "Keeps essential roles covered while reducing quiet-period staffing.",
  },
];

export function TemplatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedTemplate, setSelectedTemplate] = React.useState(templates[0].name);

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Rota templates"
      description="Preview scheduling patterns before template application is wired to draft editing."
      size="lg"
      footer={
        <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
          Close
        </ActionButton>
      }
    >
      <FormSection title="Template library">
        <div className="grid gap-3 sm:grid-cols-3">
          {templates.map((template) => {
            const selected = selectedTemplate === template.name;

            return (
              <button
                key={template.name}
                type="button"
                onClick={() => setSelectedTemplate(template.name)}
                className="rounded-xl border border-border px-3 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                <span className="flex items-center justify-between gap-2">
                  <CalendarDays className="h-4 w-4 text-brand" aria-hidden />
                  {selected && <StatusBadge tone="success">Preview</StatusBadge>}
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
        <div className="text-sm font-semibold">{selectedTemplate}</div>
        <p className="mt-1 text-xs text-muted-foreground">
          {templates.find((template) => template.name === selectedTemplate)?.detail}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Applying templates will be enabled when editable draft state is connected.
        </p>
      </div>
    </DialogShell>
  );
}
