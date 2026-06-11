import { Card } from "@/components/dl";
import { Clock, Users, AlertTriangle, FileText, CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Stat {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "info" | "warning" | "danger" | "success";
  sub?: string;
  sub2?: string;
  subline?: string;
  delta?: string;
  up?: boolean;
  isStatus?: boolean;
}

const stats: Stat[] = [
  {
    icon: Clock,
    label: "Clocked Hours",
    value: "52 h 01 m",
    sub: "vs last week",
    delta: "8%",
    up: true,
    tone: "info",
  },
  {
    icon: Users,
    label: "Pending Approvals",
    value: "3",
    sub2: "Entries",
    subline: "vs last week",
    delta: "4",
    up: false,
    tone: "warning",
  },
  {
    icon: AlertTriangle,
    label: "Unapproved",
    value: "1",
    sub2: "Entry",
    subline: "Missing clock-in",
    delta: "1",
    up: false,
    tone: "danger",
  },
  {
    icon: FileText,
    label: "Export Readiness",
    value: "4 ready",
    sub: "Four approved entries can be exported",
    tone: "success",
    isStatus: true,
  },
];

const toneBg: Record<string, string> = {
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

export function TimeMetricCards() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((s) => (
        <Card key={s.label} className="rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div
              aria-hidden="true"
              className={`h-10 w-10 rounded-full flex items-center justify-center ${toneBg[s.tone]}`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <div className="text-sm font-medium">{s.label}</div>
          </div>
          {s.isStatus ? (
            <>
              <div className="mt-3 flex items-center gap-2 text-success font-semibold">
                <CheckCircle2 className="h-5 w-5" /> {s.value}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>
            </>
          ) : (
            <>
              <div className="mt-3 text-2xl font-bold">
                {s.value}{" "}
                {s.sub2 && (
                  <span className="text-sm font-normal text-muted-foreground">{s.sub2}</span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {s.subline ?? s.sub}{" "}
                <span className={`ml-1 font-semibold ${s.up ? "text-success" : "text-danger"}`}>
                  {s.up ? "↑" : "↓"} {s.delta}
                </span>
              </div>
            </>
          )}
        </Card>
      ))}
    </div>
  );
}
