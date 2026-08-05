import { AlertTriangle, FileText, Info, ShieldAlert, Sparkles } from "lucide-react";
import { ActionButton, Card, EmptyState } from "@/components/dl";
import { cn } from "@/lib/utils";
import type { OpsRisk } from "../types";

const riskTone = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
} as const;

interface Props {
  risks: OpsRisk[];
  onOpenRisk: (risk: OpsRisk) => void;
  onUseInHandover: () => void;
  onOpenAssistant: () => void;
}

export function OpsRiskPanel({ risks, onOpenRisk, onUseInHandover, onOpenAssistant }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-warning-soft text-warning">
          <ShieldAlert className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">{risks.length} risks for handover</h2>
          <p className="text-[11px] text-muted-foreground">
            Deterministic checks from Ops and the published rota
          </p>
        </div>
      </div>
      {risks.length === 0 ? (
        <EmptyState
          title="No current operational risks"
          description="New risks will appear here as live conditions change."
        />
      ) : (
        risks.map((risk) => {
          const Icon = risk.tone === "info" ? Info : AlertTriangle;
          return (
            <button
              key={risk.id}
              type="button"
              onClick={() => onOpenRisk(risk)}
              className="flex w-full items-center gap-3 border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand"
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full",
                  riskTone[risk.tone],
                )}
              >
                <Icon className="size-3.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-semibold">{risk.title}</span>
                <span className="block text-[11px] text-muted-foreground">{risk.body}</span>
              </span>
              <span className="hidden shrink-0 text-xs font-semibold text-muted-foreground sm:block">
                Review →
              </span>
            </button>
          );
        })
      )}
      <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
        <span className="mr-auto text-[11px] text-muted-foreground">Review before handover</span>
        <ActionButton variant="ghost" size="sm" icon={FileText} onClick={onUseInHandover}>
          Use in handover
        </ActionButton>
        <ActionButton variant="outline" size="sm" icon={Sparkles} onClick={onOpenAssistant}>
          Open in assistant
        </ActionButton>
      </div>
    </Card>
  );
}
