import { SectionCard, ToggleRow } from "./SettingsPrimitives";
import { Sparkles, ShieldCheck } from "lucide-react";

export function AIManagerSupportTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Manager support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where deterministic review aids appear. They only summarise this workspace and
          point you to the right screen — they never publish or change anything on their own.
        </p>
      </div>

      <div className="rounded-3xl border border-teal-500/20 bg-teal-500/5 p-5 lg:p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              How manager support works
            </div>
            <p className="text-xs leading-relaxed text-teal-800 dark:text-teal-200">
              Support reviews your rota draft, summarises leave and timesheet counts, and routes you
              into existing manager screens. It is rule-based, not a live model — every action is a
              manager click.
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Where support appears"
        description="Choose which deterministic review aids to show."
      >
        <div className="space-y-3">
          <ToggleRow
            label="Show suggestions on Home"
            description="Top of dashboard. Dismissible. Never blocks the page."
            ariaLabel="Show suggestions on Home"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Rota review before publish"
            description="Surfaces open shifts, conflicts, and working-time alerts from the draft."
            ariaLabel="Rota review before publish"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Leave impact summary"
            description="Shows the recorded impact and request facts when reviewing leave."
            ariaLabel="Leave impact summary"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Manager review points"
            description="Surfaces rota issues to check before publishing."
            ariaLabel="Manager review points"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Guardrails"
        description="Fixed safety bounds — these cannot be turned off."
      >
        <ul className="space-y-2.5">
          {[
            "Review-only: it never publishes, sends, approves, or declines anything.",
            "It never acts on its own — every change is a manager click.",
            "It never uses pay, payroll, or private notes, and never trains on your data.",
          ].map((line) => (
            <li key={line} className="flex items-start gap-2.5 text-sm text-muted-foreground">
              <ShieldCheck
                className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400"
                aria-hidden
              />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
