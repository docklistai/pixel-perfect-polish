import { DrawerShell, ActionButton } from "@/components/dl";
import { ArrowUp, ArrowDown, BarChart2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import type { KpiItem } from "../types";
import { toneBg } from "../types";

interface Props {
  item: KpiItem | null;
  onOpenChange: (open: boolean) => void;
}

export function DashboardKpiDetailDrawer({ item, onOpenChange }: Props) {
  const navigate = useNavigate();

  const handleViewReports = () => {
    onOpenChange(false);
    navigate({ to: "/reports" });
  };

  return (
    <DrawerShell
      open={item !== null}
      onOpenChange={onOpenChange}
      title={item?.label ?? ""}
      description="This week"
      footer={
        <>
          <ActionButton variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton icon={BarChart2} onClick={handleViewReports}>
            View in reports
          </ActionButton>
        </>
      }
    >
      {item && (
        <div className="space-y-3">
          <div className="flex items-start gap-4 pb-4 border-b border-border">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] ${toneBg[item.tone] ?? "bg-muted text-muted-foreground"}`}
            >
              <item.icon className="h-6 w-6" aria-hidden />
            </div>
            <div>
              <div className="text-[34px] font-bold leading-none tracking-tight">{item.value}</div>
              <div
                className={`mt-2 flex items-center gap-1.5 text-sm font-medium ${item.up ? "text-success" : "text-danger"}`}
              >
                {item.up ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                )}
                {item.delta} vs last week
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              How this is calculated
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{item.tip}</p>
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Week-on-week trend
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-[72%] rounded-full bg-brand transition-all" />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">On track</span>
              <button
                type="button"
                onClick={handleViewReports}
                className="font-semibold text-brand hover:underline"
              >
                Drill in from Reports
              </button>
            </div>
          </div>
        </div>
      )}
    </DrawerShell>
  );
}
