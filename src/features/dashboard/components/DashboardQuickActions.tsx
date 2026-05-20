import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";
import type { QuickActionItem } from "../types";

interface Props {
  items: QuickActionItem[];
  onAction: (item: { t: string; s: string }) => void;
}

export function DashboardQuickActions({ items, onAction }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="dock-section-eyebrow">Quick actions</div>
      </div>
      <div className="divide-y divide-border">
        {items.map((a) => (
          <button
            key={a.t}
            onClick={() => onAction({ t: a.t, s: a.s })}
            className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
              <a.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{a.t}</div>
              <div className="text-[11px] text-muted-foreground">{a.s}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </Card>
  );
}
