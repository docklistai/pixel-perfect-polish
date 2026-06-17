import { Check, Info, Lightbulb } from "lucide-react";
import { ActionButton, DrawerShell, FormSection } from "@/components/dl";

/**
 * "Suggest open-shift fills" dialog. The deterministic engine
 * (`fillOpenShiftsWithSuggestions`) only assigns currently-open shifts to a
 * role-matched colleague with fewer shifts this week. It does not copy past
 * weeks, honour availability/rest/contract rules, or publish — so this dialog
 * describes exactly that and offers no toggles the engine does not enforce.
 */
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
  return (
    <DrawerShell
      open={open}
      onOpenChange={onOpenChange}
      title="Suggest open-shift fills"
      description={`Fill open shifts in the week ${weekLabel} draft. Review before publishing.`}
      width="lg"
      footer={
        <>
          <ActionButton variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </ActionButton>
          <ActionButton
            icon={Check}
            onClick={() => {
              onApplySuggestions();
              onOpenChange(false);
            }}
          >
            Fill open shifts
          </ActionButton>
        </>
      }
    >
      <FormSection title="What this does">
        <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
          {[
            "Only fills shifts that are currently open (no staff assigned).",
            "Assigns a colleague whose role matches the shift.",
            "Prefers people with fewer shifts already this week.",
            "Never double-books anyone on the same day.",
            "Leaves your existing assignments untouched.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </FormSection>

      <div
        className="rounded-xl border p-3 flex items-start gap-3"
        style={{ background: "var(--st-teal-bg)", borderColor: "var(--st-teal-line)" }}
      >
        <div className="h-7 w-7 shrink-0 rounded-md bg-brand-soft text-brand flex items-center justify-center">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        </div>
        <div className="grow">
          <div className="text-sm font-semibold text-brand">Review before publishing</div>
          <p className="text-xs text-muted-foreground mt-0.5">
            These are suggestions, not a finished rota. They do not check availability, rest gaps,
            or contracted-hour limits — check those yourself. Nothing is sent to staff until you
            publish.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
        <span>
          To start from a past week instead, close this and use “Copy last week” on the rota.
        </span>
      </div>
    </DrawerShell>
  );
}
