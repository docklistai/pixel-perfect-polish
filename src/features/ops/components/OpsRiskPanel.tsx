import { AlertTriangle, FileText, Info, ShieldAlert, Sparkles } from "lucide-react";
import { ActionButton, Card } from "@/components/dl";
import { cn } from "@/lib/utils";
import { opsRisks } from "../data/opsDemoData";
import type { OpsEntry } from "../types";

const riskTone = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
} as const;

export function OpsRiskPanel({
  entries,
  onOpenEntry,
  onOpenBriefing,
  onUseInHandover,
  onOpenAssistant,
}: {
  entries: OpsEntry[];
  onOpenEntry: (entry: OpsEntry) => void;
  onOpenBriefing: () => void;
  onUseInHandover: () => void;
  onOpenAssistant: () => void;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-[10px] bg-warning-soft text-warning">
          <ShieldAlert className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">{opsRisks.length} sample risks for handover</div>
          <div className="text-[11px] text-muted-foreground">
            Illustrative examples — not generated from live rota, leave, or labour data
          </div>
        </div>
        <span className="badge outline hidden sm:inline-flex">Sample</span>
      </div>

      {opsRisks.map((risk) => {
        const entry = risk.entryTitle
          ? entries.find((candidate) => candidate.title === risk.entryTitle)
          : undefined;
        const Icon = risk.tone === "info" ? Info : AlertTriangle;
        return (
          <button
            key={risk.title}
            type="button"
            onClick={() => (entry ? onOpenEntry(entry) : onOpenBriefing())}
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
              {risk.actionLabel} →
            </span>
          </button>
        );
      })}

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
