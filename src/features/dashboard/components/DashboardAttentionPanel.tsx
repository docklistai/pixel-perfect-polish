import { AlertTriangle, ArrowRight } from "lucide-react";
import { Card, StatusBadge } from "@/components/dl";
import type { AttentionItem } from "../types";
import { toneSoft } from "@/components/dl";
import type { Tone } from "@/components/dl";

interface Props {
  items: AttentionItem[];
  total: number;
  onAlertClick: () => void;
}

export function DashboardAttentionPanel({ items, total, onAlertClick }: Props) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="dock-section-eyebrow">Attention</div>
        <StatusBadge tone="warning">{total}</StatusBadge>
      </div>
      <div className="mt-3 space-y-2">
        {items.map((a) => {
          const tone = (a.tone ?? "warning") as Tone;
          const Icon = a.icon ?? AlertTriangle;
          return (
            <button
              key={a.t}
              type="button"
              onClick={onAlertClick}
              className="flex w-full items-start gap-3 rounded-[10px] border border-border px-3 py-2.5 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] ${toneSoft[tone]}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-snug">{a.t}</div>
                <div className="text-xs text-muted-foreground">{a.s}</div>
              </div>
              <ArrowRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={onAlertClick}
        className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand"
      >
        View all alerts ({total}) <ArrowRight className="h-3 w-3" aria-hidden />
      </button>
    </Card>
  );
}
