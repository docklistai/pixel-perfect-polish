import * as React from "react";
import { DrawerShell, ActionButton, StatusBadge } from "@/components/dl";
import {
  BarChart2,
  Star,
  Download,
  TrendingUp,
  AlertTriangle,
  Users,
  Clock,
  Info,
  Check,
} from "lucide-react";
import { toast } from "sonner";

interface ReportDetail {
  name: string;
  sub?: string;
  tag?: string;
  icon?: React.ComponentType<{ className?: string }>;
}

interface Props {
  report: ReportDetail | null;
  onOpenChange: (open: boolean) => void;
  onExport?: () => void;
}

interface ReviewPoint {
  title: string;
  body: string;
  tone: "success" | "warning" | "info";
  icon: React.ComponentType<{ className?: string }>;
  reviewed: boolean;
}

export function InsightDetailDrawer({ report, onOpenChange, onExport }: Props) {
  const [reviewedPoints, setReviewedPoints] = React.useState<Record<string, boolean>>({});

  const reportData = React.useMemo(() => {
    if (!report) return null;
    return {
      name: report.name,
      sub: report.sub ?? "Sample report preview · not refreshed from live reporting",
      tag: report.tag ?? "Sample",
      icon: report.icon ?? BarChart2,
      numbers: [
        { key: "Sample period total", value: "£20,840", delta: "Illustrative only", down: false },
        { key: "Sample best week", value: "W20", delta: "£10,640", down: false },
        { key: "Sample variance", value: "£1,420", delta: "vs sample target", down: true },
      ],
      reviewPoints: [
        {
          title: "Labour % is improving",
          body: "Down 0.8pp vs last 4 weeks — you're tracking ahead of target.",
          tone: "success" as const,
          icon: TrendingUp,
        },
        {
          title: "Saturday is spending more than needed",
          body: "Late Bar cover runs beyond forecast demand. ~£86/week saving available.",
          tone: "warning" as const,
          icon: Clock,
        },
        {
          title: "Kitchen ratios look healthy",
          body: "Daniel and Priya cover well — no obvious kitchen gaps to fill.",
          tone: "info" as const,
          icon: Users,
        },
      ],
      breakdown: [
        { dept: "Front of House", hours: "492h", cost: "£7,750", pct: "37%" },
        { dept: "Kitchen", hours: "384h", cost: "£6,250", pct: "30%" },
        { dept: "Housekeeping", hours: "196h", cost: "£2,840", pct: "14%" },
        { dept: "Bar", hours: "168h", cost: "£2,400", pct: "12%" },
        { dept: "Maintenance", hours: "128h", cost: "£1,600", pct: "7%" },
      ],
    };
  }, [report]);

  if (!report || !reportData) return null;

  const handleSave = () => {
    toast.info("Preview only", {
      description: "The saved-report library is sample-only; no report was added.",
    });
  };

  const toggleReviewed = (title: string) => {
    setReviewedPoints((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const IconComponent = reportData.icon;

  return (
    <DrawerShell
      open={report !== null}
      onOpenChange={(open) => {
        if (!open) onOpenChange(false);
      }}
      title={reportData.name}
      description="Sample last 4 weeks · All departments"
      meta={
        <StatusBadge tone={reportData.tag === "Custom" ? "purple" : "brand"}>
          {reportData.tag}
        </StatusBadge>
      }
      footer={
        <div className="flex w-full items-center justify-end gap-2">
          <ActionButton variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </ActionButton>
          <ActionButton variant="secondary" size="sm" icon={Star} onClick={handleSave}>
            Preview save
          </ActionButton>
          {onExport && (
            <ActionButton variant="secondary" size="sm" icon={Download} onClick={onExport}>
              Preview export
            </ActionButton>
          )}
        </div>
      }
      width="lg"
    >
      <div className="space-y-4">
        {/* Report Header Card */}
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-brand-soft text-brand shrink-0">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">{reportData.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{reportData.sub}</div>
          </div>
        </div>

        {/* Key Numbers Grid Card */}
        <div className="card p-4 bg-muted/20 border border-border rounded-xl">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Sample key numbers
          </div>
          <div className="grid grid-cols-3 gap-4">
            {reportData.numbers.map((n, i) => (
              <div key={i} className="space-y-1">
                <div className="text-[11px] text-muted-foreground font-medium">{n.key}</div>
                <div className="text-lg font-bold tracking-tight text-foreground">{n.value}</div>
                <div
                  className={`text-[10px] font-semibold ${n.down ? "text-danger" : "text-success"}`}
                >
                  {n.delta}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Review Points Panel */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="h-3.5 w-3.5 text-brand" />
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Sample coaching signals
            </div>
          </div>
          <div className="space-y-2">
            {reportData.reviewPoints.map((point) => {
              const isReviewed = reviewedPoints[point.title];
              const PointIcon = point.icon;
              return (
                <button
                  key={point.title}
                  type="button"
                  onClick={() => toggleReviewed(point.title)}
                  className={`flex w-full items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                    isReviewed
                      ? "bg-muted/10 border-border/40 opacity-50"
                      : "bg-card border-border hover:bg-muted/40"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg shrink-0 ${
                      point.tone === "success"
                        ? "bg-success-soft text-success"
                        : point.tone === "warning"
                          ? "bg-warning-soft text-warning"
                          : "bg-info-soft text-info"
                    }`}
                  >
                    {isReviewed ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <PointIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="space-y-0.5">
                    <div
                      className={`text-xs font-semibold ${isReviewed ? "line-through text-muted-foreground" : "text-foreground"}`}
                    >
                      {point.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-normal">
                      {point.body}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Department Breakdown Table */}
        <div className="space-y-2">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Sample breakdown
          </div>
          <div className="card border border-border/80 rounded-xl overflow-hidden bg-card">
            <table className="tbl w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-muted-foreground p-2 px-3 bg-muted/20 border-b border-border">
                    Department
                  </th>
                  <th className="text-left font-semibold text-muted-foreground p-2 border-b border-border">
                    Hours
                  </th>
                  <th className="text-left font-semibold text-muted-foreground p-2 border-b border-border">
                    Cost
                  </th>
                  <th className="text-right font-semibold text-muted-foreground p-2 px-3 border-b border-border">
                    % of total
                  </th>
                </tr>
              </thead>
              <tbody>
                {reportData.breakdown.map((row, i) => (
                  <tr
                    key={i}
                    className="hover:bg-muted/20 border-b border-border/40 last:border-b-0"
                  >
                    <td className="p-2.5 px-3 font-medium text-foreground">{row.dept}</td>
                    <td className="p-2.5 font-mono text-muted-foreground">{row.hours}</td>
                    <td className="p-2.5 font-mono text-muted-foreground">{row.cost}</td>
                    <td className="p-2.5 px-3 text-right font-mono text-muted-foreground">
                      {row.pct}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DrawerShell>
  );
}
