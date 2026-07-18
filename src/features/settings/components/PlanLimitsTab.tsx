import * as React from "react";
import { PreviewTag, SectionCard } from "./SettingsPrimitives";
import { Check } from "lucide-react";
import { COMMERCIAL_PLANS } from "@/config/commercial";

const indicativePlans = [
  {
    ...COMMERCIAL_PLANS.starter,
    features: ["Weekly rota", "Manager publish", "Staff portal"],
  },
  {
    ...COMMERCIAL_PLANS.core,
    features: ["Publish review", "Leave and time", "Approved-hours export"],
  },
  {
    ...COMMERCIAL_PLANS.pro,
    features: ["Core workflows", "Manager support", "Operational issue log"],
  },
] as const;

export function PlanLimitsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Plan & limits</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Indicative post-beta plans and sample usage. Billing is inactive.
        </p>
      </div>

      <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold">Private beta access</div>
              <PreviewTag>No active plan</PreviewTag>
              <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                Invitation only
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Workspace access is arranged manually; plan limits are not enforced during beta.
            </p>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-2xl font-bold">
              £0 <span className="text-xs font-normal text-muted-foreground">charged</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              No checkout, trial, renewal, cancellation fee, or refund process
            </div>
          </div>
        </div>
      </div>

      <SectionCard
        title="Sample usage"
        description="Illustrative limits only — not contractual or enforced during private beta."
      >
        <div className="space-y-4">
          {[
            { label: "Staff seats", used: 8, total: 50 },
            { label: "Locations", used: 1, total: 5 },
            { label: "Active managers", used: 1, total: 10 },
          ].map((item, index) => {
            const pct = (item.used / item.total) * 100;
            const isHigh = pct >= 90;
            return (
              <div key={index} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono font-semibold">
                    {item.used} / {item.total}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${
                      isHigh ? "bg-warning" : "bg-brand"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Indicative plans after beta"
        description="Public and in-app preview prices share one source. Switching and billing are disabled."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {indicativePlans.map((plan) => (
            <div
              key={plan.name}
              className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4"
            >
              <div className="space-y-3">
                <span className="text-sm font-semibold">{plan.name} (planned)</span>
                <div>
                  <div className="font-mono text-xl font-bold">
                    {plan.monthlyPrice}
                    <span className="text-xs font-normal text-muted-foreground">
                      /mo after beta
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">{plan.staffLimit}</div>
                </div>
                <div className="border-t border-border pt-3">
                  <ul className="space-y-1.5">
                    {plan.features.map((feat, fi) => (
                      <li
                        key={fi}
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                      >
                        <Check className="h-3 w-3 shrink-0 text-teal-600 dark:text-teal-400" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-xl bg-muted py-1.5 text-xs font-semibold text-foreground opacity-70"
              >
                Indicative only
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
