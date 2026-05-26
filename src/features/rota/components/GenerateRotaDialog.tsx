import * as React from "react";
import { Sparkles } from "lucide-react";
import { ActionButton, DrawerShell, FormSection } from "@/components/dl";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const BASE_OPTIONS = [
  {
    id: "last-week",
    title: "Last week's published rota",
    description: "Closest match — copies the week's pattern.",
  },
  {
    id: "same-month",
    title: "Same week last month",
    description: "Useful for monthly events and seasonality.",
  },
  {
    id: "blank",
    title: "Blank template",
    description: "Start from scratch with role coverage requirements only.",
  },
] as const;

const RULES = [
  { id: "availability", label: "Respect staff availability", defaultOn: true },
  { id: "rest", label: "Respect 11h rest between shifts", defaultOn: true },
  { id: "contract", label: "Cap weekly hours at contract", defaultOn: true },
  { id: "back-to-back", label: "Avoid back-to-back closing → opening shifts", defaultOn: false },
  { id: "same-role", label: "Prefer same-role consistency", defaultOn: true },
] as const;

type BaseId = (typeof BASE_OPTIONS)[number]["id"];

export function GenerateRotaDialog({
  open,
  onOpenChange,
  weekLabel,
  onApplySuggestions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  weekLabel: string;
  days?: unknown;
  shifts?: unknown;
  staff?: unknown;
  onApplySuggestions: () => void;
}) {
  const [base, setBase] = React.useState<BaseId>("last-week");

  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Generate rota"
      description={`Suggest a starting draft for week ${weekLabel}.`}
      width="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={() =>
              toast.info("Preview", {
                description: "Showing preview before applying.",
              })
            }
          >
            Preview
          </ActionButton>
          <ActionButton
            icon={Sparkles}
            onClick={() => {
              onApplySuggestions();
              onOpenChange(false);
            }}
          >
            Generate draft
          </ActionButton>
        </>
      }
    >
      <FormSection title="Base on">
        <div className="flex flex-col gap-2">
          {BASE_OPTIONS.map((option) => {
            const selected = base === option.id;
            return (
              <label
                key={option.id}
                className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition ${
                  selected
                    ? "border-brand/40 bg-brand-soft/60"
                    : "border-border bg-card hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  name="generate-base"
                  className="mt-1 h-4 w-4 accent-brand"
                  checked={selected}
                  onChange={() => setBase(option.id)}
                />
                <div className="grow">
                  <div className="text-sm font-semibold">{option.title}</div>
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                </div>
              </label>
            );
          })}
        </div>
      </FormSection>

      <FormSection title="Rules">
        <div className="flex flex-col gap-3">
          {RULES.map((rule) => (
            <div key={rule.id} className="flex items-center gap-3">
              <span className="grow text-sm font-medium">{rule.label}</span>
              <Switch defaultChecked={rule.defaultOn} aria-label={rule.label} />
            </div>
          ))}
        </div>
      </FormSection>

      <div
        className="rounded-xl border p-3 flex items-start gap-3"
        style={{
          background: "var(--st-teal-bg)",
          borderColor: "var(--st-teal-line)",
        }}
      >
        <div className="h-7 w-7 shrink-0 rounded-md bg-brand-soft text-brand flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="grow">
          <div className="text-sm font-semibold text-brand">AI assist</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Suggestions are starting points only — you always review before publishing. Nothing is
            sent to staff until you publish.
          </p>
        </div>
      </div>
    </DrawerShell>
  );
}
