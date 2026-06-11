import * as React from "react";
import { SectionCard } from "./SettingsPrimitives";
import { Check } from "lucide-react";

export function PlanLimitsTab() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[28px] font-semibold leading-tight text-foreground">Plan & limits</h2>
        <p className="mt-1 text-sm text-muted-foreground">Your current workspace plan and usage.</p>
      </div>

      <div className="rounded-3xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 to-transparent p-5 lg:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="text-lg font-bold">Hospitality · Pro</div>
              <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2.5 py-0.5 text-xs font-semibold text-teal-600 dark:text-teal-400">
                Current plan
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Up to 50 staff per workspace · all manager features
            </p>
          </div>
          <div className="sm:text-right">
            <div className="font-mono text-2xl font-bold">
              £89 <span className="text-xs font-normal text-muted-foreground">/ month</span>
            </div>
            <div className="text-[10px] text-muted-foreground">Renews 8 Jul 2026</div>
          </div>
        </div>
      </div>

      <SectionCard title="Usage" description="Your resource consumption for this billing period.">
        <div className="space-y-4">
          {[
            { label: "Staff seats", used: 48, total: 50 },
            { label: "Locations", used: 3, total: 5 },
            { label: "Active managers", used: 6, total: 10 },
            { label: "AI assistant calls (this month)", used: 1840, total: 5000 },
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

      <SectionCard title="Compare plans" description="Choose the scope that fits your operations.">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              name: "Starter",
              price: "£29",
              desc: "10 staff",
              features: ["Rota", "Staff", "Time"],
              current: false,
            },
            {
              name: "Pro",
              price: "£89",
              desc: "50 staff",
              features: ["+ Reports", "+ AI assistant", "+ Integrations"],
              current: true,
            },
            {
              name: "Group",
              price: "Talk",
              desc: "Unlimited",
              features: ["+ Multi-workspace", "+ SSO", "+ Priority support"],
              current: false,
            },
          ].map((plan, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-4 flex flex-col justify-between ${
                plan.current
                  ? "border-teal-500/20 bg-teal-500/5 dark:bg-teal-500/10"
                  : "border-border bg-card"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{plan.name}</span>
                  {plan.current && (
                    <span className="inline-flex items-center rounded-full bg-teal-500/10 px-2 py-0.5 text-[10px] font-semibold text-teal-600 dark:text-teal-400">
                      Current
                    </span>
                  )}
                </div>
                <div>
                  <div className="font-mono text-xl font-bold">
                    {plan.price}
                    {plan.price !== "Talk" && (
                      <span className="text-xs font-normal text-muted-foreground">/mo</span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{plan.desc}</div>
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
                disabled={plan.current}
                className={`mt-4 w-full rounded-xl py-1.5 text-xs font-semibold transition ${
                  plan.current
                    ? "bg-teal-500/10 text-teal-600 dark:text-teal-400 cursor-not-allowed opacity-80"
                    : "bg-muted hover:bg-muted/70 text-foreground"
                }`}
              >
                {plan.current ? "Current plan" : "Switch"}
              </button>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
