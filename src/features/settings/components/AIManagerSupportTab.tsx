import * as React from "react";
import { SectionCard, ToggleRow } from "./SettingsPrimitives";
import { Sparkles, Wand2, Info } from "lucide-react";

export function AIManagerSupportTab({ onDirty }: { onDirty: () => void }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">
          AI manager support
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose where the assistant offers practical help. It always drafts — it never publishes on
          its own.
        </p>
      </div>

      <div className="rounded-3xl border border-teal-500/20 bg-teal-500/5 p-5 lg:p-6">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-teal-950 dark:text-teal-50">
              How AI is used
            </div>
            <p className="text-xs leading-relaxed text-teal-800 dark:text-teal-200">
              The assistant reviews your rota, summarises leave impact, drafts announcements, and
              helps you move faster through existing manager workflows. Nothing is automated — every
              action is a manager click.
            </p>
          </div>
        </div>
      </div>

      <SectionCard
        title="Where AI appears"
        description="Choose features to enrich with manager drafting or reviews."
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
            description="Detects conflicts, tight rest gaps, and coverage risks."
            ariaLabel="Rota review before publish"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Announcement drafting"
            description="Drafts only — you review and publish."
            ariaLabel="Announcement drafting"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Handover summary"
            description="Auto-compiles end-of-day notes into a draft."
            ariaLabel="Handover summary"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Leave impact summary"
            description="Explains coverage risk when reviewing requests."
            ariaLabel="Leave impact summary"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Manager review points"
            description="Surfaces things to discuss in 1:1s."
            ariaLabel="Manager review points"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <SectionCard title="Guardrails" description="Safety bounds for assistant reasoning.">
        <div className="space-y-3">
          <ToggleRow
            label="Allow AI to publish staff updates automatically"
            description="Off by default. Recommended OFF."
            ariaLabel="Allow AI to publish staff updates automatically"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Include pay information in AI context"
            description="Hourly rates available for cost summaries."
            ariaLabel="Include pay information in AI context"
            onDirty={onDirty}
          />
          <ToggleRow
            label="Train on this workspace's data"
            description="Improves suggestions for your venues."
            ariaLabel="Train on this workspace's data"
            onDirty={onDirty}
          />
        </div>
      </SectionCard>

      <div className="rounded-3xl border border-dashed border-border p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Wand2 className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold">Custom AI playbooks</div>
                <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Preview
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Save common manager prompts as one-click actions.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground opacity-50 cursor-not-allowed"
          >
            Configure
          </button>
        </div>
      </div>
    </div>
  );
}
