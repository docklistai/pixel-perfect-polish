import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/dl";
import type { QuickActionItem } from "../types";

interface Props {
  items: QuickActionItem[];
}

export function DashboardQuickActions({ items }: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="px-5 pb-3 pt-5">
        <div className="dock-section-eyebrow">Quick actions</div>
      </div>
      <div className="divide-y divide-border">
        {items.map((a) => (
          <Link
            key={a.t}
            to={a.route ?? "/"}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition hover:bg-muted/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-[12px] bg-brand-soft text-brand">
              <a.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium">{a.t}</span>
                {a.preview && (
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </span>
                )}
              </div>
              <div className="text-[11px] text-muted-foreground">{a.s}</div>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          </Link>
        ))}
      </div>
    </Card>
  );
}
