import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, KeyRound } from "lucide-react";
import { Card } from "@/components/dl";
import { useIntents } from "@/lib/interactionIntents";
import type { DashboardSetupPlan, DashboardSetupStep } from "../lib/dashboardSetup";

interface Props {
  plan: DashboardSetupPlan;
}

/**
 * Live-workspace setup / weekly-readiness checklist. Every step is derived
 * from real workspace reads — a step only shows as done when the data proves
 * it. Replaces the attention summary while the workspace or week is empty.
 */
export function DashboardSetupPanel({ plan }: Props) {
  const navigate = useNavigate();
  const { requestIntent } = useIntents();

  const runStep = (step: DashboardSetupStep) => {
    navigate({ to: step.route });
    if (step.intent) requestIntent(step.intent);
  };

  const nextStepId = plan.steps.find((step) => !step.done)?.id;

  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="dock-section-eyebrow">
            {plan.mode === "workspace" ? "Getting started" : "This week"}
          </div>
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {plan.doneCount} of {plan.steps.length} done
          </span>
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">{plan.title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{plan.subtitle}</p>

        <ol className="mt-4 space-y-2">
          {plan.steps.map((step) => {
            const isNext = step.id === nextStepId;
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className={`flex items-start gap-3 rounded-[10px] border px-3 py-2.5 ${
                  isNext ? "border-brand/30 bg-brand-soft/25" : "border-border"
                }`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${
                    step.done
                      ? "bg-success-soft text-success"
                      : "bg-brand-soft text-brand"
                  }`}
                >
                  {step.done ? (
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className={`text-sm font-medium leading-snug ${
                      step.done ? "text-muted-foreground line-through decoration-border" : ""
                    }`}
                  >
                    {step.title}
                  </div>
                  {!step.done && (
                    <div className="text-xs text-muted-foreground">{step.description}</div>
                  )}
                </div>
                {!step.done && (
                  <button
                    type="button"
                    onClick={() => runStep(step)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      isNext
                        ? "bg-brand text-white hover:bg-brand/90"
                        : "border border-border hover:bg-muted/40"
                    }`}
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      {plan.showAccessCodesHint && (
        <div className="flex items-center gap-2.5 border-t border-border px-5 py-3">
          <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground">
            Staff sign in to their portal with personal access codes.
          </p>
          <button
            type="button"
            onClick={() => {
              navigate({ to: "/staff" });
              requestIntent("staff.accessCodes");
            }}
            className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded px-1"
          >
            Share access codes <ArrowRight className="h-3 w-3" aria-hidden />
          </button>
        </div>
      )}
    </Card>
  );
}
